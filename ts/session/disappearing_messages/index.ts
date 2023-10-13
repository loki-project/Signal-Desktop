import { throttle, uniq } from 'lodash';
import { messagesExpired } from '../../state/ducks/conversations';
import { initWallClockListener } from '../../util/wallClockListener';

import { Data } from '../../data/data';
import { ConversationModel } from '../../models/conversation';
import { MessageModel } from '../../models/message';
import { SignalService } from '../../protobuf';
import { ReleasedFeatures } from '../../util/releaseFeature';
import { expireMessageOnSnode } from '../apis/snode_api/expireRequest';
import { GetNetworkTime } from '../apis/snode_api/getNetworkTime';
import { getConversationController } from '../conversations';
import { isValidUnixTimestamp } from '../utils/Timestamps';
import {
  checkIsLegacyDisappearingDataMessage,
  couldBeLegacyDisappearingMessageContent,
} from './legacy';
import {
  DisappearingMessageConversationModeType,
  DisappearingMessageMode,
  DisappearingMessageType,
  DisappearingMessageUpdate,
} from './types';

export async function destroyMessagesAndUpdateRedux(
  messages: Array<{
    conversationKey: string;
    messageId: string;
  }>
) {
  if (!messages.length) {
    return;
  }
  const conversationWithChanges = uniq(messages.map(m => m.conversationKey));

  try {
    const messageIds = messages.map(m => m.messageId);

    // Delete any attachments
    for (let i = 0; i < messageIds.length; i++) {
      /* eslint-disable no-await-in-loop */
      const message = await Data.getMessageById(messageIds[i]);
      await message?.cleanup();
      /* eslint-enable no-await-in-loop */
    }

    // Delete all those messages in a single sql call
    await Data.removeMessagesByIds(messageIds);
  } catch (e) {
    window.log.error('destroyMessages: removeMessagesByIds failed', e && e.message ? e.message : e);
  }
  // trigger a redux update if needed for all those messages
  window.inboxStore?.dispatch(messagesExpired(messages));

  // trigger a refresh the last message for all those uniq conversation
  conversationWithChanges.forEach(convoIdToUpdate => {
    getConversationController()
      .get(convoIdToUpdate)
      ?.updateLastMessage();
  });
}

async function destroyExpiredMessages() {
  try {
    window.log.info('destroyExpiredMessages: Loading messages...');
    const messages = await Data.getExpiredMessages();

    const messagesExpiredDetails: Array<{
      conversationKey: string;
      messageId: string;
    }> = messages.map(m => ({
      conversationKey: m.get('conversationId'),
      messageId: m.id,
    }));

    messages.forEach(expired => {
      window.log.info('Message expired', {
        sentAt: expired.get('sent_at'),
      });
    });

    await destroyMessagesAndUpdateRedux(messagesExpiredDetails);
  } catch (error) {
    window.log.error(
      'destroyExpiredMessages: Error deleting expired messages',
      error && error.stack ? error.stack : error
    );
  }

  window.log.info('destroyExpiredMessages: complete');
  void checkExpiringMessages();
}

let timeout: NodeJS.Timeout | undefined;

async function checkExpiringMessages() {
  // Look up the next expiring message and set a timer to destroy it
  const messages = await Data.getNextExpiringMessage();
  const next = messages.at(0);
  if (!next) {
    return;
  }

  const expiresAt = next.getExpiresAt();
  if (!expiresAt) {
    return;
  }
  window.log.info('next message expires', new Date(expiresAt).toISOString());
  window.log.info('next message expires in ', (expiresAt - Date.now()) / 1000);

  let wait = expiresAt - Date.now();

  // In the past
  if (wait < 0) {
    wait = 0;
  }

  // Too far in the future, since it's limited to a 32-bit value
  if (wait > 2147483647) {
    wait = 2147483647;
  }

  if (timeout) {
    global.clearTimeout(timeout);
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  timeout = global.setTimeout(async () => destroyExpiredMessages(), wait);
}
const throttledCheckExpiringMessages = throttle(checkExpiringMessages, 1000);

let isInit = false;

export const initExpiringMessageListener = () => {
  if (isInit) {
    throw new Error('expiring messages listener is already init');
  }

  void checkExpiringMessages();

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  initWallClockListener(async () => throttledCheckExpiringMessages());
  isInit = true;
};

export const updateExpiringMessagesCheck = () => {
  void throttledCheckExpiringMessages();
};

export function setExpirationStartTimestamp(
  mode: DisappearingMessageConversationModeType,
  timestamp?: number,
  callLocation?: string // this is for debugging purposes
): number | undefined {
  let expirationStartTimestamp: number | undefined = GetNetworkTime.getNowWithNetworkOffset();

  if (callLocation) {
    window.log.debug(`WIP: [setExpirationStartTimestamp] called from: ${callLocation} `);
  }

  // TODO legacy messages support will be removed in a future release
  if (timestamp) {
    if (!isValidUnixTimestamp(timestamp)) {
      window.log.debug(
        `WIP: [setExpirationStartTimestamp] We compared 2 timestamps for a disappearing message (${mode}) and the argument timestamp is invalid`
      );
      return undefined;
    }
    window.log.debug(
      `WIP: [setExpirationStartTimestamp] We compare 2 timestamps for a disappearing message (${mode}):\nexpirationStartTimestamp `,
      new Date(expirationStartTimestamp).toLocaleTimeString(),
      '\ntimestamp ',
      new Date(timestamp).toLocaleTimeString()
    );
    expirationStartTimestamp = Math.min(expirationStartTimestamp, timestamp);
  }

  // TODO legacy messages support will be removed in a future release
  if (mode === 'deleteAfterRead') {
    window.log.debug(
      `WIP: [setExpirationStartTimestamp] We set the start timestamp for a delete after read message to ${new Date(
        expirationStartTimestamp
      ).toLocaleTimeString()}`
    );
  } else if (mode === 'deleteAfterSend') {
    window.log.debug(
      `WIP: [setExpirationStartTimestamp] We set the start timestamp for a delete after send message to ${new Date(
        expirationStartTimestamp
      ).toLocaleTimeString()}`
    );
  } else if (mode === 'legacy') {
    window.log.debug(
      `WIP: [setExpirationStartTimestamp] We set the start timestamp for a legacy message to ${new Date(
        expirationStartTimestamp
      ).toLocaleTimeString()}`
    );
  } else if (mode === 'off') {
    window.log.debug(
      'WIP: [setExpirationStartTimestamp] Disappearing message mode has been turned off. We can safely ignore this.'
    );
    expirationStartTimestamp = undefined;
  } else {
    window.log.debug(
      `WIP: [setExpirationStartTimestamp] Invalid disappearing message mode "${mode}" set. Ignoring`
    );
    expirationStartTimestamp = undefined;
  }

  return expirationStartTimestamp;
}

// TODO legacy messages support will be removed in a future release
/**
 * Converts DisappearingMessageConversationModeType to DisappearingMessageType
 *
 * NOTE Used for sending or receiving data messages (protobuf)
 *
 * @param convo Conversation we want to set
 * @param expirationMode DisappearingMessageConversationModeType
 * @returns Disappearing mode we should use
 */
export function changeToDisappearingMessageType(
  convo: ConversationModel,
  expireTimer: number,
  expirationMode?: DisappearingMessageConversationModeType
): DisappearingMessageType {
  if (expirationMode === 'off' || expirationMode === 'legacy') {
    // NOTE we would want this to be undefined but because of an issue with the protobuf implement we need to have a value
    return 'unknown';
  }

  if (expireTimer > 0) {
    if (convo.isMe() || convo.isClosedGroup()) {
      return 'deleteAfterSend';
    }

    return expirationMode === 'deleteAfterSend' ? 'deleteAfterSend' : 'deleteAfterRead';
  }

  return 'unknown';
}

// TODO legacy messages support will be removed in a future release
/**
 * Converts DisappearingMessageType to DisappearingMessageConversationModeType
 *
 * NOTE Used for the UI
 *
 * @param convo  Conversation we want to set
 * @param expirationType DisappearingMessageType
 * @param expireTimer in seconds, 0 means no expiration
 * @returns
 */
export function changeToDisappearingConversationMode(
  convo: ConversationModel,
  expirationType?: DisappearingMessageType,
  expireTimer?: number
): DisappearingMessageConversationModeType {
  if (!expirationType || expirationType === 'unknown') {
    return expireTimer && expireTimer > 0 ? 'legacy' : 'off';
  }

  if (convo.isMe() || convo.isClosedGroup()) {
    return 'deleteAfterSend';
  }

  return expirationType === 'deleteAfterSend' ? 'deleteAfterSend' : 'deleteAfterRead';
}

/**
 * Checks if a message is meant to disappear but doesn't have the correct expiration values set
 *
 * NOTE Examples: legacy disappearing message conversation settings, synced messages from legacy devices
 */
function checkDisappearButIsntMessage(
  content: SignalService.Content,
  convo: ConversationModel,
  expirationMode: DisappearingMessageConversationModeType,
  expirationTimer: number
): boolean {
  return (
    content.dataMessage?.flags !== SignalService.DataMessage.Flags.EXPIRATION_TIMER_UPDATE &&
    expirationMode === 'off' &&
    expirationTimer === 0 &&
    convo.getExpirationMode() !== 'off' &&
    convo.getExpireTimer() !== 0
  );
}

// TODO legacy messages support will be removed in a future release
export async function checkForExpireUpdateInContentMessage(
  content: SignalService.Content,
  convoToUpdate: ConversationModel,
  isOutgoing?: boolean
): Promise<DisappearingMessageUpdate | undefined> {
  const dataMessage = content.dataMessage as SignalService.DataMessage;
  // We will only support legacy disappearing messages for a short period before disappearing messages v2 is unlocked
  const isDisappearingMessagesV2Released = await ReleasedFeatures.checkIsDisappearMessageV2FeatureReleased();

  const couldBeLegacyContentMessage = couldBeLegacyDisappearingMessageContent(content);
  const isLegacyDataMessage = checkIsLegacyDisappearingDataMessage(
    couldBeLegacyContentMessage,
    dataMessage as SignalService.DataMessage
  );
  const isLegacyConversationSettingMessage = isDisappearingMessagesV2Released
    ? (isLegacyDataMessage ||
        (couldBeLegacyContentMessage && !content.lastDisappearingMessageChangeTimestamp)) &&
      dataMessage.flags === SignalService.DataMessage.Flags.EXPIRATION_TIMER_UPDATE
    : couldBeLegacyContentMessage &&
      dataMessage.flags === SignalService.DataMessage.Flags.EXPIRATION_TIMER_UPDATE;

  const expirationTimer = isLegacyDataMessage
    ? Number(dataMessage.expireTimer)
    : content.expirationTimer;

  // NOTE we don't use the expirationType directly from the Content Message because we need to resolve it to the correct convo type first in case it is legacy or has errors
  const expirationMode = changeToDisappearingConversationMode(
    convoToUpdate,
    DisappearingMessageMode[content.expirationType],
    expirationTimer
  );

  const lastDisappearingMessageChangeTimestamp = content.lastDisappearingMessageChangeTimestamp
    ? Number(content.lastDisappearingMessageChangeTimestamp)
    : undefined;

  // NOTE if we are checking an outgoing content message then the conversation's lastDisappearingMessageChangeTimestamp has just been set to match the content message so it can't be outdated if equal
  if (
    convoToUpdate.getLastDisappearingMessageChangeTimestamp() &&
    lastDisappearingMessageChangeTimestamp &&
    ((isOutgoing &&
      convoToUpdate.getLastDisappearingMessageChangeTimestamp() >
        lastDisappearingMessageChangeTimestamp) ||
      (!isOutgoing &&
        convoToUpdate.getLastDisappearingMessageChangeTimestamp() >=
          lastDisappearingMessageChangeTimestamp))
  ) {
    window.log.info(
      `WIP: checkForExpireUpdateInContentMessage() This is an outdated ${
        isOutgoing ? 'outgoing' : 'incoming'
      } disappearing message setting. So we will ignore it.\nconvoToUpdate.getLastDisappearingMessageChangeTimestamp(): ${convoToUpdate.get(
        'lastDisappearingMessageChangeTimestamp'
      )}\nlastDisappearingMessageChangeTimestamp: ${lastDisappearingMessageChangeTimestamp}\n\ncontent: ${JSON.stringify(
        content
      )}`
    );

    return {
      expirationType: changeToDisappearingMessageType(
        convoToUpdate,
        expirationTimer,
        expirationMode
      ),
      expirationTimer,
      isOutdated: true,
    };
  }

  const shouldDisappearButIsntMessage = checkDisappearButIsntMessage(
    content,
    convoToUpdate,
    expirationMode,
    expirationTimer
  );

  const expireUpdate: DisappearingMessageUpdate = {
    expirationType: changeToDisappearingMessageType(convoToUpdate, expirationTimer, expirationMode),
    expirationTimer,
    lastDisappearingMessageChangeTimestamp,
    isLegacyConversationSettingMessage,
    isLegacyDataMessage,
    isDisappearingMessagesV2Released,
    shouldDisappearButIsntMessage,
  };

  // NOTE some platforms do not include the diappearing message values in the Data Message for sent messages so we have to trust the conversation settings until v2 is released
  if (
    !isDisappearingMessagesV2Released &&
    !isLegacyConversationSettingMessage &&
    couldBeLegacyContentMessage &&
    convoToUpdate.getExpirationMode() !== 'off'
  ) {
    if (
      expirationMode !== convoToUpdate.getExpirationMode() ||
      expirationTimer !== convoToUpdate.getExpireTimer()
    ) {
      window.log.debug(
        `WIP: Received a legacy disappearing message before v2 was released without values set. Using the conversation settings.\ncontent: ${JSON.stringify(
          content
        )}\n\nconvoToUpdate: ${JSON.stringify(convoToUpdate)}`
      );

      expireUpdate.expirationTimer = convoToUpdate.getExpireTimer();
      expireUpdate.expirationType = changeToDisappearingMessageType(
        convoToUpdate,
        expireUpdate.expirationTimer,
        convoToUpdate.getExpirationMode()
      );
      expireUpdate.isLegacyDataMessage = true;
    }
  }

  // NOTE If it is a legacy message and disappearing messages v2 is released then we ignore it and use the local client's conversation settings and show the outdated client banner
  if (
    isDisappearingMessagesV2Released &&
    (isLegacyDataMessage || isLegacyConversationSettingMessage || shouldDisappearButIsntMessage)
  ) {
    window.log.debug(
      `WIP: Received a legacy disappearing message after v2 was released. Overriding it with the conversation settings\ncontent: ${JSON.stringify(
        content
      )}\n\nconvoToUpdate: ${JSON.stringify(convoToUpdate)}`
    );

    expireUpdate.expirationTimer = convoToUpdate.getExpireTimer();
    expireUpdate.expirationType = changeToDisappearingMessageType(
      convoToUpdate,
      expireUpdate.expirationTimer,
      convoToUpdate.getExpirationMode()
    );
    expireUpdate.isLegacyDataMessage = true;
  }

  return expireUpdate;
}

// TODO legacy messages support will be removed in a future release
export function getMessageReadyToDisappear(
  conversationModel: ConversationModel,
  messageModel: MessageModel,
  expireUpdate?: DisappearingMessageUpdate
) {
  if (!expireUpdate) {
    window.log.debug(`WIP: called getMessageReadyToDisappear() without an expireUpdate`);
    return messageModel;
  }

  if (conversationModel.isPublic()) {
    window.log.warn(
      "getMessageReadyToDisappear() Disappearing messages aren't supported in communities"
    );
    return messageModel;
  }

  const {
    expirationType,
    expirationTimer: expireTimer,
    lastDisappearingMessageChangeTimestamp,
    isLegacyConversationSettingMessage,
    isDisappearingMessagesV2Released,
  } = expireUpdate;

  messageModel.set({
    expirationType,
    expireTimer,
  });

  // This message is conversation setting change message
  if (lastDisappearingMessageChangeTimestamp || isLegacyConversationSettingMessage) {
    const expirationTimerUpdate = {
      expirationType,
      expireTimer,
      lastDisappearingMessageChangeTimestamp: isLegacyConversationSettingMessage
        ? isDisappearingMessagesV2Released
          ? 0
          : GetNetworkTime.getNowWithNetworkOffset()
        : Number(lastDisappearingMessageChangeTimestamp),
      source: messageModel.get('source'),
    };

    messageModel.set({
      expirationTimerUpdate,
    });
  }

  return messageModel;
}

export async function checkHasOutdatedDisappearingMessageClient(
  convoToUpdate: ConversationModel,
  sender: ConversationModel,
  expireUpdate: DisappearingMessageUpdate
) {
  const isOutdated =
    expireUpdate.isLegacyDataMessage ||
    expireUpdate.isLegacyConversationSettingMessage ||
    expireUpdate.shouldDisappearButIsntMessage;

  const outdatedSender =
    sender.get('nickname') || sender.get('displayNameInProfile') || sender.get('id');

  if (convoToUpdate.getHasOutdatedClient()) {
    // trigger notice banner
    if (isOutdated) {
      if (convoToUpdate.getHasOutdatedClient() !== outdatedSender) {
        convoToUpdate.set({
          hasOutdatedClient: outdatedSender,
        });
      }
    } else {
      convoToUpdate.set({
        hasOutdatedClient: undefined,
      });
    }
    await convoToUpdate.commit();
    return;
  }

  if (isOutdated) {
    convoToUpdate.set({
      hasOutdatedClient: outdatedSender,
    });
    await convoToUpdate.commit();
  }
}

export async function updateMessageExpiryOnSwarm(
  message: MessageModel,
  callLocation?: string, // this is for debugging purposes
  shouldCommit?: boolean
) {
  if (callLocation) {
    window.log.debug(`WIP: [updateMessageExpiryOnSwarm] called from: ${callLocation} `);
  }

  if (!message.getExpirationType() || !message.getExpireTimer()) {
    window.log.debug(
      `WIP: [updateMessageExpiryOnSwarm] Message ${message.get(
        'messageHash'
      )} has no expirationType or expireTimer set. Ignoring`
    );
    return message;
  }

  const messageHash = message.get('messageHash');
  if (!messageHash) {
    window.log.debug(
      `WIP: [updateMessageExpiryOnSwarm] Missing messageHash message: ${JSON.stringify(message)}`
    );
    return message;
  }

  // window.log.debug(`WIP: [updateMessageExpiryOnSwarm]\nmessage: ${JSON.stringify(message)}`);

  const newTTL = await expireMessageOnSnode({
    messageHash,
    expireTimer: message.getExpireTimer() * 1000,
    shorten: true,
  });
  const expiresAt = message.getExpiresAt();

  if (newTTL && newTTL !== expiresAt) {
    message.set({
      expires_at: newTTL,
    });

    window.log.debug(
      `WIP: [updateMessageExpiryOnSwarm] messageHash ${messageHash} has a new TTL of ${newTTL} which expires at ${new Date(
        newTTL
      ).toUTCString()}`
    );

    if (shouldCommit) {
      await message.commit();
    }
  } else {
    window.log.warn(
      `WIP: [updateMessageExpiryOnSwarm]\nmessageHash ${messageHash} has no new TTL.${
        expiresAt
          ? `\nKeeping the old one ${expiresAt}which expires at ${new Date(
              expiresAt
            ).toUTCString()}`
          : ''
      }`
    );
  }

  return message;
}