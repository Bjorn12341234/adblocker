import { getStorage, setStorage } from '../lib/storage';

const globalToggle = document.getElementById('globalToggle');
const siteToggle = document.getElementById('siteToggle');
const statsCount = document.getElementById('statsCount');
const openOptions = document.getElementById('openOptions');

async function init() {
  const data = await getStorage();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const domain = url.hostname;

  // Initialize UI
  globalToggle.checked = data.settings.enabledGlobal;

  // Site toggle is "Enabled on this site"
  // If whitelisted, it's NOT enabled
  siteToggle.checked = !data.lists.whitelist.includes(domain);

  // Stats (placeholder for now)
  statsCount.textContent = '0';

  // Listeners
  globalToggle.addEventListener('change', async () => {
    data.settings.enabledGlobal = globalToggle.checked;
    await setStorage(data);
  });

  siteToggle.addEventListener('change', async () => {
    const isEnabled = siteToggle.checked;
    if (isEnabled) {
      // Remove from whitelist
      data.lists.whitelist = data.lists.whitelist.filter((d) => d !== domain);
    } else {
      // Add to whitelist
      if (!data.lists.whitelist.includes(domain)) {
        data.lists.whitelist.push(domain);
      }
    }
    await setStorage(data);
  });

  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
