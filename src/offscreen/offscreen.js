/**
 * Offscreen Document - The GPU Worker
 * Handles heavy ML inference (MediaPipe, Transformers.js)
 */

console.log('Offscreen document loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  handleMessage(message).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message) {
  console.log('Offscreen received message:', message.type);

  switch (message.type) {
    case 'PING':
      return { success: true, data: 'PONG' };

    case 'SCAN_IMAGE':
      // This will be implemented in Phase 6
      return { success: true, isBlocked: false, confidence: 0 };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}
