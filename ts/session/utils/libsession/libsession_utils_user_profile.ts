import { isEmpty } from 'lodash';
import { UserUtils } from '..';
import { UserConfigWrapperActions } from '../../../webworker/workers/browser/libsession_worker_interface';
import { ConvoHub } from '../../conversations';
import { fromHexToArray } from '../String';
import { CONVERSATION_PRIORITIES } from '../../../models/conversationAttributes';
import { Storage } from '../../../util/storage';
import { SettingsKey } from '../../../data/settings-key';

async function insertUserProfileIntoWrapper(convoId: string) {
  if (!isUserProfileToStoreInWrapper(convoId)) {
    return;
  }
  const us = UserUtils.getOurPubKeyStrFromCache();
  const ourConvo = ConvoHub.use().get(us);

  if (!ourConvo) {
    throw new Error('insertUserProfileIntoWrapper needs a ourConvo to exist');
  }

  const dbName = ourConvo.getRealSessionUsername() || '';
  const dbProfileUrl = ourConvo.getAvatarPointer() || '';
  const dbProfileKey = fromHexToArray(ourConvo.getProfileKey() || '');
  const priority = ourConvo.getPriority() || CONVERSATION_PRIORITIES.default;

  const areBlindedMsgRequestEnabled = !!Storage.get(SettingsKey.hasBlindedMsgRequestsEnabled);

  window.log.debug(
    `inserting into userprofile wrapper: username:"${dbName}", priority:${priority} image:${JSON.stringify(
      { url: dbProfileUrl, key: dbProfileKey }
    )}, settings: ${JSON.stringify({ areBlindedMsgRequestEnabled })}`
  );
  // const expirySeconds = ourConvo.get('expireTimer') || 0;
  if (dbProfileUrl && !isEmpty(dbProfileKey)) {
    await UserConfigWrapperActions.setUserInfo(
      dbName,
      priority,
      {
        url: dbProfileUrl,
        key: dbProfileKey,
      }
      // expirySeconds
    );
  } else {
    await UserConfigWrapperActions.setUserInfo(dbName, priority, null); // expirySeconds
  }
  await UserConfigWrapperActions.setEnableBlindedMsgRequest(areBlindedMsgRequestEnabled);
}

function isUserProfileToStoreInWrapper(convoId: string) {
  try {
    const us = UserUtils.getOurPubKeyStrFromCache();
    return convoId === us;
  } catch (e) {
    return false;
  }
}

export const SessionUtilUserProfile = {
  insertUserProfileIntoWrapper,
  isUserProfileToStoreInWrapper,
};
