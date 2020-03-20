module.exports = {
  // common
  sessionLoader: '//div[contains(@class, "session-loader")]',
  leftPaneOverlay: '//div[contains(@class, "module-left-pane-overlay")]',
  sendMessageTextarea:
    '//textarea[contains(@placeholder, "Type your message")]',
  sendFriendRequestTextarea:
    '//textarea[contains(@placeholder, "Send your first message")]',
  existingSendMessageText: textMessage =>
    `//*[contains(@class, "module-message__text--outgoing")and .//span[contains(@class, "text-selectable")][contains(string(), '${textMessage}')]]`,
  existingFriendRequestText: textMessage =>
    `//*[contains(@class, "module-message-friend-request__container")and .//span[contains(@class, "text-selectable")][contains(string(), '${textMessage}')]]`,

  // conversations
  conversationButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "chatBubble")]]',
  retrySendButton:
    '//div[contains(string(), "Retry Send")][contains(@class, "module-friend-request__buttonContainer--outgoing")]',

  // channels
  globeButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "globe")]]',
  joinOpenGroupButton:
    '//div[contains(string(), "Join Open Group")][contains(@role, "button")]',
  openGroupInputUrl:
    '//textarea[contains(@placeholder, "chat.getsession.org")]',
  sessionToastJoinOpenGroupSuccess:
    '//div[contains(string(), "Successfully connected to new open group server")][contains(@class, "session-toast-wrapper")]',
  sessionToastJoinOpenGroupAlreadyExist:
    '//div[contains(string(), "You are already connected to this public channel")][contains(@class, "session-toast-wrapper")]',
  rowOpenGroupConversationName: groupName =>
    `//span[contains(string(), "${groupName}")][contains(@class, "module-conversation__user__profile-number")]`,

  // contacts
  contactsButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "users")]]',
  addContactButton:
    '//div[contains(string(), "Add Contact")][contains(@role, "button")]',
  sessionIDInput: '//textarea[contains(@placeholder, "Enter a Session ID")]',
  nextButton: '//div[contains(string(), "Next")][contains(@role, "button")]',
  oneNotificationFriendRequestLeft:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "users")]  and .//*[contains(@class, "notification-count") and contains(string(), "1")] ]',
  oneNotificationFriendRequestTop:
    '//*[contains(@class,"contact-notification-count-bubble") and contains(string(), "1")]',
  friendRequestFromUser: (displayName, pubkey) =>
    `//*[contains(@class,"module-left-pane__list-popup")  and .//*[contains(@class, "module-conversation__user") and .//*[contains(string(), "${displayName}")] and .//*[contains(string(), "(...${pubkey.substring(
      60
    )})")]]]`,
  acceptFriendRequestButton:
    '//*[contains(@role, "button")][contains(@class, "session-button")][contains(string(), "Accept")]',
  acceptedFriendRequestMessage:
    '//*[contains(@class, "module-friend-request__title")][contains(string(), "Friend request accepted")]',

  // settings
  settingsButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "gear")]]',
  deviceSettingsRow:
    '//*[contains(@class, "left-pane-setting-category-list-item")][contains(string(), "Devices")]',

  // device pairing
  noPairedDeviceMessage:
    '//*[contains(@class, "session-settings-item__title")][contains(string(), "No paired devices")]',
  linkDeviceButton:
    '//div[contains(string(), "Link New Device")][contains(@role, "button")]',
  devicePairingDialog: '//*[contains(@class,"device-pairing-dialog")]',
  qrImageDiv: '//div[contains(@class,"qr-image")]',
  allowPairingButton:
    '//div[contains(string(), "Allow Pairing")][contains(@role, "button")]',
  okButton: '//div[contains(string(), "OK")][contains(@role, "button")]',
  devicePairedDescription: secretWords =>
    `//div[contains(string(), "${secretWords}")][contains(@class, "session-settings-item__description")]`,
  unpairDeviceButton:
    '//div[contains(string(), "Unpair Device")][contains(@role, "button")][contains(@class, "danger")]',
};
