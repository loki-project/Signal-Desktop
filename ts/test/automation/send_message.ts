import { _electron, Page } from '@playwright/test';
import { messageSent } from './message';
import { clickOnTestIdWithText, typeIntoInput } from './utils';

export const sendNewMessage = async (window: Page, sessionid: string, message: string) => {
  await clickOnTestIdWithText(window, 'new-conversation-button');
  console.warn(sessionid);
  // Enter session ID of USER B
  await typeIntoInput(window, 'new-session-conversation', sessionid);

  // click next
  await window.click('"Next"');
  // await clickOnTestIdWithText(window, 'next-new-conversation-button', 'Next');
  await messageSent(window, message);
};
