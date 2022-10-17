import { assert } from 'chai';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';

import { ConversationLookupType } from '../../../../state/ducks/conversations';
import {
  _getConversationComparator,
  _getSortedConversations,
} from '../../../../state/selectors/conversations';

describe('state/selectors/conversations', () => {
  describe('#getSortedConversationsList', () => {
    // tslint:disable-next-line: max-func-body-length
    it('sorts conversations based on timestamp then by intl-friendly title', () => {
      const i18n = (key: string) => key;
      const data: ConversationLookupType = {
        id1: {
          id: 'id1',
          activeAt: 0,
          displayNameInProfile: 'No timestamp',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          hasNickname: false,
          isPublic: false,
          subscriberCount: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          expireTimer: 0,
          isPinned: false,
        },
        id2: {
          id: 'id2',
          activeAt: 20,
          displayNameInProfile: 'B',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          hasNickname: false,
          isPublic: false,
          subscriberCount: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          expireTimer: 0,
          isPinned: false,
        },
        id3: {
          id: 'id3',
          activeAt: 20,
          displayNameInProfile: 'C',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          hasNickname: false,
          isPublic: false,
          subscriberCount: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          expireTimer: 0,
          isPinned: false,
        },
        id4: {
          id: 'id4',
          activeAt: 20,
          displayNameInProfile: 'Á',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          hasNickname: false,
          isPublic: false,
          subscriberCount: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          expireTimer: 0,
          lastMessage: undefined,
          members: [],
          isPinned: false,
        },
        id5: {
          id: 'id5',
          activeAt: 30,
          displayNameInProfile: 'First!',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          hasNickname: false,
          isPublic: false,
          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: false,
        },
      };
      const comparator = _getConversationComparator(i18n);
      const conversations = _getSortedConversations(data, comparator, []);

      assert.strictEqual(conversations[0].displayNameInProfile, 'First!');
      assert.strictEqual(conversations[1].displayNameInProfile, 'Á');
      assert.strictEqual(conversations[2].displayNameInProfile, 'B');
      assert.strictEqual(conversations[3].displayNameInProfile, 'C');
    });
  });

  describe('#getSortedConversationsWithPinned', () => {
    // tslint:disable-next-line: max-func-body-length
    it('sorts conversations based on pin, timestamp then by intl-friendly title', () => {
      const i18n = (key: string) => key;
      const data: ConversationLookupType = {
        id1: {
          id: 'id1',
          activeAt: 0,
          displayNameInProfile: 'No timestamp',

          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: false,
          hasNickname: false,
          isPublic: false,
        },
        id2: {
          id: 'id2',
          activeAt: 20,
          displayNameInProfile: 'B',

          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: false,
          hasNickname: false,
          isPublic: false,
        },
        id3: {
          id: 'id3',
          activeAt: 20,

          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,
          displayNameInProfile: 'C',

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: true,
          hasNickname: false,
          isPublic: false,
        },
        id4: {
          id: 'id4',
          activeAt: 20,
          displayNameInProfile: 'Á',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,
          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: true,
          hasNickname: false,
          isPublic: false,
        },
        id5: {
          id: 'id5',
          activeAt: 30,
          displayNameInProfile: 'First!',
          type: ConversationTypeEnum.PRIVATE,
          isMe: false,
          unreadCount: 1,
          mentionedUs: false,
          isSelected: false,
          isTyping: false,
          isBlocked: false,
          isKickedFromGroup: false,
          left: false,

          subscriberCount: 0,
          expireTimer: 0,
          currentNotificationSetting: 'all',
          weAreAdmin: false,
          isGroup: false,
          isPrivate: false,

          avatarPath: '',
          groupAdmins: [],
          groupModerators: [],
          lastMessage: undefined,
          members: [],
          isPinned: false,
          hasNickname: false,
          isPublic: false,
        },
      };
      const comparator = _getConversationComparator(i18n);
      const conversations = _getSortedConversations(data, comparator, []);

      assert.strictEqual(conversations[0].displayNameInProfile, 'Á');
      assert.strictEqual(conversations[1].displayNameInProfile, 'C');
      assert.strictEqual(conversations[2].displayNameInProfile, 'First!');
      assert.strictEqual(conversations[3].displayNameInProfile, 'B');
    });
  });
});
