import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useInterval, useMount } from 'react-use';
import styled from 'styled-components';
import { useIsDetailMessageView } from '../../../../contexts/isDetailViewContext';
import { Data } from '../../../../data/data';
import { MessageModelType } from '../../../../models/messageType';
import { getConversationController } from '../../../../session/conversations';
import { PropsForExpiringMessage, messagesExpired } from '../../../../state/ducks/conversations';
import { getIncrement } from '../../../../util/timer';
import { ExpireTimer } from '../../ExpireTimer';
import { ReadableMessage, ReadableMessageProps } from './ReadableMessage';
import { useSelectedConversationKey } from '../../../../state/selectors/selectedConversation';
import {
  useMessageDirection,
  useMessageExpirationDurationMs,
  useMessageExpirationTimestamp,
  useMessageIsExpired,
  useMessageIsUnread,
  useMessageReceivedAt,
} from '../../../../state/selectors';

const EXPIRATION_CHECK_MINIMUM = 2000;

function useIsExpired(
  props: Omit<PropsForExpiringMessage, 'messageId' | 'direction'> & {
    messageId: string | undefined;
    direction: MessageModelType | undefined;
  }
) {
  const {
    convoId,
    messageId,
    expirationDurationMs,
    expirationTimestamp,
    isExpired: isExpiredProps,
  } = props;

  const dispatch = useDispatch();

  const [isExpired] = useState(isExpiredProps);

  const checkExpired = useCallback(async () => {
    const now = Date.now();

    if (!messageId || !expirationTimestamp || !expirationDurationMs) {
      return;
    }

    if (isExpired || now >= expirationTimestamp) {
      await Data.removeMessage(messageId);
      if (convoId) {
        dispatch(
          messagesExpired([
            {
              conversationKey: convoId,
              messageId,
            },
          ])
        );
        const convo = getConversationController().get(convoId);
        convo?.updateLastMessage();
      }
    }
  }, [messageId, expirationTimestamp, expirationDurationMs, isExpired, convoId, dispatch]);

  let checkFrequency: number | null = null;
  if (expirationDurationMs) {
    const increment = getIncrement(expirationDurationMs || EXPIRATION_CHECK_MINIMUM);
    checkFrequency = Math.max(EXPIRATION_CHECK_MINIMUM, increment);
  }

  useMount(() => {
    void checkExpired();
  }); // check on mount

  useInterval(checkExpired, checkFrequency); // check every 2sec or sooner if needed

  return { isExpired };
}

const StyledReadableMessage = styled(ReadableMessage)<{
  isIncoming: boolean;
}>`
  display: flex;
  justify-content: flex-end; // ${props => (props.isIncoming ? 'flex-start' : 'flex-end')};
  align-items: ${props => (props.isIncoming ? 'flex-start' : 'flex-end')};
  width: 100%;
  flex-direction: column;
`;

export interface ExpirableReadableMessageProps
  extends Omit<ReadableMessageProps, 'receivedAt' | 'isUnread'> {
  messageId: string;
  isControlMessage?: boolean;
}

function ExpireTimerControlMessage({
  expirationTimestamp,
  expirationDurationMs,
  isControlMessage,
}: {
  expirationDurationMs: number | null | undefined;
  expirationTimestamp: number | null | undefined;
  isControlMessage: boolean | undefined;
}) {
  if (!isControlMessage) {
    return null;
  }
  return (
    <ExpireTimer
      expirationDurationMs={expirationDurationMs || undefined}
      expirationTimestamp={expirationTimestamp}
    />
  );
}

export const ExpirableReadableMessage = (props: ExpirableReadableMessageProps) => {
  const { isControlMessage, onClick, onDoubleClickCapture, role, dataTestId, messageId } = props;

  const convoId = useSelectedConversationKey();
  const direction = useMessageDirection(messageId);
  const expirationDurationMs = useMessageExpirationDurationMs(messageId);
  const expirationTimestamp = useMessageExpirationTimestamp(messageId);
  const messageIsExpired = useMessageIsExpired(messageId);
  const isUnread = useMessageIsUnread(messageId);
  const receivedAt = useMessageReceivedAt(messageId);

  const isDetailView = useIsDetailMessageView();

  const { isExpired } = useIsExpired({
    convoId,
    messageId,
    direction,
    expirationTimestamp,
    expirationDurationMs,
    isExpired: messageIsExpired,
  });

  if (!messageId || isExpired) {
    return null;
  }

  // NOTE we want messages on the left in the message detail view regardless of direction
  const overridenDirection = isDetailView ? 'incoming' : direction;
  const isIncoming = overridenDirection === 'incoming';

  return (
    <StyledReadableMessage
      messageId={messageId}
      receivedAt={receivedAt}
      isUnread={!!isUnread}
      isIncoming={isIncoming}
      onClick={onClick}
      onDoubleClickCapture={onDoubleClickCapture}
      role={role}
      key={`readable-message-${messageId}`}
      dataTestId={dataTestId}
    >
      <ExpireTimerControlMessage
        expirationDurationMs={expirationDurationMs}
        expirationTimestamp={expirationTimestamp}
        isControlMessage={isControlMessage}
      />
      {props.children}
    </StyledReadableMessage>
  );
};