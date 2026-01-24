import { getStorage } from './lib/storage';
import { scanAndFilter } from './lib/dom';

let keywords = [];
let enabled = false;

async function init() {
  const data = await getStorage();

  // Check if disabled for this site
  const domain = window.location.hostname;
  if (
    data.settings.enabledGlobal === false ||
    data.lists.whitelist.includes(domain)
  ) {
    console.log('Trump Filter: Disabled for this site/globally');
    return;
  }

  keywords = data.lists.userKeywords;
  enabled = true;

  if (keywords.length > 0) {
    // Initial scan
    scanAndFilter(keywords, data.settings);

    // Observe for dynamic content
    const observer = new MutationObserver(
      debounce(() => {
        scanAndFilter(keywords, data.settings);
      }, 500)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

init();
