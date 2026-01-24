import { updateRules } from './lib/backgroundLogic';

console.log('Trump Filter Background Service Started');

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated. Initializing rules...');
  updateRules();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lists) {
    console.log('Lists changed. Updating rules...');
    updateRules();
  }
});
