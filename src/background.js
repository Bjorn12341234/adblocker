import { updateRules, sendMessageToOffscreen } from './lib/backgroundLogic';

console.log('Trump Filter Background Service Started');

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated. Initializing...');
  await updateRules();

  // Test offscreen bridge
  try {
    const response = await sendMessageToOffscreen('PING');
    console.log('Offscreen Bridge Test:', response);
  } catch (e) {
    console.error('Offscreen Bridge Test Failed:', e);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lists) {
    console.log('Lists changed. Updating rules...');
    updateRules();
  }
});

// Listen for messages (from Content Script, Popup, or Options)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'background') {
    handleBackgroundMessage(message, sender).then(sendResponse);
    return true;
  }
});

async function handleBackgroundMessage(message, sender) {
  switch (message.type) {
    case 'CHECK_IMAGE':
      // Forward to offscreen
      return await sendMessageToOffscreen('SCAN_IMAGE', message.data);
    default:
      return { success: false, error: 'Unknown background message type' };
  }
}
