import { getStorage } from './storage';
import { generateRules } from './rules';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

export async function updateRules() {
  try {
    const data = await getStorage();
    const newRules = generateRules(data.lists);

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: newRules,
    });

    console.log(`Rules updated. Active rules: ${newRules.length}`);
    return newRules.length;
  } catch (error) {
    console.error('Failed to update rules:', error);
    throw error;
  }
}

/**
 * Ensures an offscreen document exists.
 */
export async function setupOffscreen() {
  // Check if it already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create it
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_SCRAPING'], // Required reason for ML/DOM processing
    justification: 'Running local ML models for image content analysis.',
  });

  console.log('Offscreen document created');
}

/**
 * Sends a message to the offscreen document.
 */
export async function sendMessageToOffscreen(type, data = {}) {
  await setupOffscreen();
  return chrome.runtime.sendMessage({
    target: 'offscreen',
    type,
    data,
  });
}
