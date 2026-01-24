const DEFAULT_SETTINGS = {
  version: 2,
  settings: {
    enabledGlobal: true,
    sensitivity: 'balanced',
    aiMode: 'none',
    aiConsent: false,
  },
  lists: {
    whitelist: ['example.com'],
    userKeywords: ['trump'],
  },
};

export async function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        // Simple merge - in production use deep merge
        resolve({
          ...DEFAULT_SETTINGS,
          ...result,
          settings: {
            ...DEFAULT_SETTINGS.settings,
            ...(result.settings || {}),
          },
          lists: { ...DEFAULT_SETTINGS.lists, ...(result.lists || {}) },
        });
      });
    });
  }
  return DEFAULT_SETTINGS;
}

export async function setStorage(data) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }
  // Mock behavior for non-extension env if needed, or just no-op
}

export const defaults = DEFAULT_SETTINGS;
