import { getStorage } from './storage';
import { generateRules } from './rules';

export async function updateRules() {
  try {
    const data = await getStorage();
    const newRules = generateRules(data.lists);

    // Get existing rules to remove them (clean slate)
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: newRules,
    });

    console.log(`Rules updated. Active rules: ${newRules.length}`);
    return newRules.length; // Return for testing
  } catch (error) {
    console.error('Failed to update rules:', error);
    throw error;
  }
}
