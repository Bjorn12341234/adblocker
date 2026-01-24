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
      try {
        let base64Data = message.data.base64;

        // If no base64 provided (legacy or failed in content script), try to fetch here
        if (!base64Data && message.data.url) {
          try {
            const response = await fetch(message.data.url);
            const blob = await response.blob();
            const reader = new FileReader();
            base64Data = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (fetchError) {
            console.error('Background fetch failed:', fetchError);
            // Return success: false but with error details
            return { success: false, error: fetchError.message };
          }
        }

        if (!base64Data) {
          return { success: false, error: 'No image data available' };
        }

        // Forward to offscreen
        return await sendMessageToOffscreen('SCAN_IMAGE', {
          type: 'base64',
          data: base64Data,
          strictMode: message.data.strictMode,
        });
      } catch (error) {
        console.error('Error fetching image for check:', error);
        return { success: false, error: error.message };
      }
    default:
      return { success: false, error: 'Unknown background message type' };
  }
}
