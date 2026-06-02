(() => {
  'use strict';

  // ============================================
  // EXPANDED KEYWORDS (keeps chat working)
  // ============================================

  const EXTRA_KEYWORDS = [
    'donald trump',
    'president trump',
    'former president trump',
    'trump administration',
    'mar-a-lago',
    'truth social',
  ];

  // ============================================
  // BASIC SETUP
  // ============================================

  const DEFAULT_CONFIG = {
    version: 2,
    settings: {
      enabledGlobal: true,
      sensitivity: 'strict',
      aiMode: 'mobilenet',
      aiConsent: true,
    },
    lists: {
      whitelist: ['example.com'],
      userKeywords: ['trump'],
    },
  };

  async function loadConfig() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return DEFAULT_CONFIG;
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Storage error:', chrome.runtime.lastError.message);
            return resolve(DEFAULT_CONFIG);
          }

          resolve({
            ...DEFAULT_CONFIG,
            ...result,
            settings: {
              ...DEFAULT_CONFIG.settings,
              ...(result.settings || {}),
            },
            lists: { ...DEFAULT_CONFIG.lists, ...(result.lists || {}) },
          });
        });
      } catch (error) {
        console.warn('Failed to access storage:', error.message);
        resolve(DEFAULT_CONFIG);
      }
    });
  }

  async function updateStats(increment = 1) {
    try {
      const config = await loadConfig();
      const blockedCount = (config.stats?.blockedCount || 0) + increment;

      await chrome.storage.local.set({
        ...config,
        stats: {
          ...config.stats,
          blockedCount,
          lastUpdate: Date.now(),
        },
      });
    } catch (error) {
      // Stats update failure is non-critical, ignore silently
    }
  }

  // ============================================
  // ENHANCED SELECTORS (includes Watch pages)
  // ============================================

  const CONTAINER_SELECTORS = [
    'article',
    '.card',
    '.teaser',
    '.story',
    '.sidebar',
    '.post',
    '.content-item',
    'div[role="article"]',
    'div[role="listitem"]',
    '.g',
    '.b_algo',

    // Reddit
    'shreddit-post',
    // Hacker News
    'tr.athing',
    // YouTube
    'ytd-video-renderer',
    'ytd-rich-item-renderer',

    // Facebook Watch pages
    'div[data-pagelet="WatchPermalinkVideo"]',
    'div[data-pagelet="VideoMetadata"]',
    'div[data-pagelet="TahoeRightRail"]',
    'div[data-pagelet="TahoeRightRailRecommendations"]',
  ];

  // ============================================
  // FILTERING LOGIC
  // ============================================

  function matchesKeywords(element, keywords) {
    if (!keywords || keywords.length === 0) return false;
    const text = (element.innerText || element.textContent || '').toLowerCase();
    return keywords.some((keyword) => {
      if (!keyword) return false;
      return text.includes(keyword.toLowerCase());
    });
  }

  function getImageContext(img) {
    let context = (img.alt || '') + ' ' + (img.title || '');

    const link = img.closest('a');
    if (link) {
      context += ' ' + (link.innerText || link.textContent || '');
    }

    const figure = img.closest('figure');
    if (figure) {
      const caption = figure.querySelector('figcaption');
      if (caption) {
        context += ' ' + (caption.innerText || caption.textContent || '');
      }
    }

    return context.trim();
  }

  function hideElement(element, reason) {
    if (element.tagName === 'IMG') {
      const placeholder = createPlaceholder(element, reason);
      element.parentNode.insertBefore(placeholder, element);
      element.style.display = 'none';
    } else {
      element.style.transition =
        'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease';
      element.style.overflow = 'hidden';
      element.style.maxHeight = '0';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.border = '0';
      element.style.opacity = '0';
    }

    element.dataset.orangeFilterHidden = 'true';
    console.debug(`Orange Filter: Hidden element (${reason})`);
    updateStats(1);
  }

  function createPlaceholder(img, reason) {
    const placeholder = document.createElement('div');
    placeholder.className = 'orange-filter-placeholder';
    placeholder.title = `Filtered: ${reason}`;

    const style = window.getComputedStyle(img);
    const width = img.naturalWidth || img.width || parseInt(style.width);
    const height = img.naturalHeight || img.height || parseInt(style.height);

    placeholder.style.width =
      style.width !== '0px' ? style.width : width ? width + 'px' : '100%';

    if (width && height) {
      placeholder.style.aspectRatio = `${width} / ${height}`;
      placeholder.style.height = 'auto';
    } else {
      placeholder.style.height =
        style.height !== '0px' ? style.height : '150px';
    }

    placeholder.style.display =
      style.display === 'inline' ? 'inline-block' : style.display;
    placeholder.style.backgroundColor = '#f4f4f4';
    placeholder.style.backgroundImage =
      'linear-gradient(45deg, #f4f4f4 25%, #eeeeee 25%, #eeeeee 50%, #f4f4f4 50%, #f4f4f4 75%, #eeeeee 75%, #eeeeee 100%)';
    placeholder.style.backgroundSize = '20px 20px';
    placeholder.style.border = '1px solid #ddd';
    placeholder.style.color = '#888';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.fontSize = '11px';
    placeholder.style.fontWeight = '500';
    placeholder.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    placeholder.style.textAlign = 'center';
    placeholder.style.overflow = 'hidden';
    placeholder.style.cursor = 'pointer';
    placeholder.style.flexDirection = 'column';
    placeholder.style.gap = '4px';

    const text = document.createElement('div');
    text.textContent = 'Filtered Content (Click to show)';
    placeholder.appendChild(text);

    const report = document.createElement('div');
    report.textContent = 'Report False Positive';
    report.style.fontSize = '9px';
    report.style.textDecoration = 'underline';
    report.style.opacity = '0.7';

    report.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(
        `Orange Filter: False positive reported - ${img.src || img.currentSrc}`
      );
      placeholder.click();
      alert('Thank you for your report!');
    });

    placeholder.appendChild(report);

    placeholder.addEventListener('click', (e) => {
      e.stopPropagation();
      placeholder.remove();
      img.style.display = '';
      img.dataset.orangeFilterHidden = 'false';
      img.dataset.orangeFilterRevealed = 'true';
    });

    return placeholder;
  }

  async function filterContent(keywords, settings = {}, extraSelectors = []) {
    const aiOn = aiEnabled(settings);
    const hasKeywords = !!(keywords && keywords.length > 0);

    // Sprint 3.1: the AI must be able to run on its own. Previously this bailed
    // whenever the keyword list was empty, so "disable keywords + AI only" did
    // nothing at all. Now keyword filtering runs when there are keywords, and
    // the AI image scan runs whenever AI is enabled — independently.
    if (!hasKeywords && !aiOn) return;

    // EXTRA_KEYWORDS only augment an explicit user keyword list; in pure AI mode
    // (no user keywords) we do NOT silently apply them, so the AI is tested alone.
    const allKeywords = hasKeywords ? [...keywords, ...EXTRA_KEYWORDS] : [];

    // Filter text content (only with keywords, and not in pictures-only mode)
    if (hasKeywords && settings.sensitivity !== 'pictures-only') {
      const selectors = [...CONTAINER_SELECTORS, ...extraSelectors];
      const containers = document.querySelectorAll(selectors.join(', '));

      containers.forEach((container) => {
        if (container.dataset.orangeFilterHidden === 'true') return;

        if (matchesKeywords(container, allKeywords)) {
          hideElement(container, 'Text match');
        }
      });
    }

    // Filter images
    const images = document.querySelectorAll(
      'img:not([data-orange-filter-hidden="true"]):not([data-orange-filter-revealed="true"])'
    );
    const imagesToScan = [];

    // The keyword/caption path hides captioned Trump images; the AI's job is
    // every image whose caption does NOT match (bare/uncaptioned photos, memes,
    // image-search thumbs). Those are queued for the AI regardless of text.
    let contextHidden = 0;
    images.forEach((img) => {
      if (img.closest('[data-orange-filter-hidden="true"]')) return;

      if (hasKeywords) {
        const context = getImageContext(img);
        if (
          allKeywords.some((kw) =>
            context.toLowerCase().includes(kw.toLowerCase())
          )
        ) {
          hideElement(img, 'Image context match');
          contextHidden++;
          return;
        }
      }

      if (aiOn && !img.dataset.orangeFilterScanning) {
        imagesToScan.push(img);
      }
    });

    if (aiOn) {
      // Sprint 2.4: make the AI's reach observable instead of silent. If this
      // logs "0 queued" on a Trump page, the AI is being starved by the keyword
      // path; if it queues images but nothing hides, the pipeline/model is at
      // fault — either way it's now visible in the page console.
      console.debug(
        `[OrangeFilter] image pass: ${contextHidden} hidden by caption, ` +
          `${imagesToScan.length} queued for AI`
      );
    }

    if (imagesToScan.length > 0) {
      await scanImagesWithAI(imagesToScan, settings);
    }
  }

  async function scanImagesWithAI(images, settings) {
    const queue = [...images];

    const scanNext = async () => {
      if (queue.length === 0) return;

      const img = queue.shift();
      // Use rendered OR intrinsic size — lazy-loaded / just-injected images can
      // report width 0 before layout, which previously skipped them silently.
      const w = img.width || img.naturalWidth || 0;
      const h = img.height || img.naturalHeight || 0;
      if (img.dataset.orangeFilterScanning || w < 50 || h < 50) {
        return scanNext();
      }

      const imgSrc = img.currentSrc || img.src;
      if (!imgSrc) return scanNext();

      img.dataset.orangeFilterScanning = 'true';

      try {
        let payload = { url: imgSrc, sensitivity: settings.sensitivity };
        let blob = null;

        if (imgSrc.startsWith('data:')) {
          const response = await fetch(imgSrc);
          blob = await response.blob();
        } else {
          try {
            const base64 = await imageToBase64(img);
            if (base64) {
              payload.data = base64;
              payload.type = 'base64';
            }
          } catch (e) {
            // Canvas is tainted (cross-origin, no CORS) — fall back to a
            // content-side fetch; if that also fails the background fetches the
            // URL itself (it has <all_urls> host permission). See Sprint 2.4.
            console.debug('[OrangeFilter] canvas tainted, falling back:', e);
            blob = await fetchImageBlob(imgSrc);
          }
        }

        if (!payload.data && blob) {
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          payload.data = base64;
          payload.type = 'base64';
        }

        const result = await chrome.runtime.sendMessage({
          target: 'background',
          type: 'CHECK_IMAGE',
          data: payload,
        });

        // Sprint 2.4: stamp every scanned image with its outcome so the AI path
        // is inspectable in the DOM (and consumed by the integration test).
        img.dataset.orangeFilterDebug = JSON.stringify({
          src: imgSrc.slice(0, 80),
          sentData: payload.data ? 'inline' : 'url-only',
          ...(result || { success: false, error: 'no response' }),
        });

        if (result && result.success) {
          const confidence = Math.round(result.confidence * 100);

          if (result.isBlocked) {
            hideElement(img, `AI detected (${confidence}%)`);
          } else if (result.confidence > 0.65) {
            blurElement(img, `AI low confidence (${confidence}%)`);
          }
        } else {
          console.debug(
            '[OrangeFilter] AI scan returned no block:',
            imgSrc.slice(0, 80),
            result
          );
        }
      } catch (err) {
        // Sprint 2.4: don't swallow — surface so we can tell a real failure
        // (CORS, decode, model error) from "the AI simply never ran".
        console.debug(
          '[OrangeFilter] AI scan error:',
          imgSrc.slice(0, 80),
          err
        );
        img.dataset.orangeFilterDebug = JSON.stringify({
          src: imgSrc.slice(0, 80),
          error: String(err && err.message ? err.message : err),
        });
      } finally {
        delete img.dataset.orangeFilterScanning;
        scanNext();
      }
    };

    // Scan 3 at a time
    for (let i = 0; i < 3 && i < images.length; i++) {
      scanNext();
    }
  }

  function blurElement(element, reason) {
    element.style.filter = 'blur(20px)';
    element.style.cursor = 'pointer';
    element.title = `Filtered: ${reason} (Click to show)`;
    element.dataset.orangeFilterHidden = 'true';

    const clickHandler = function (e) {
      e.stopPropagation();
      element.style.filter = '';
      element.style.cursor = '';
      element.title = '';
      element.dataset.orangeFilterHidden = 'false';
      element.dataset.orangeFilterRevealed = 'true';
      element.removeEventListener('click', clickHandler);
    };

    element.addEventListener('click', clickHandler);
    console.debug(`Orange Filter: Blurred element (${reason})`);
    updateStats(1);
  }

  async function imageToBase64(img) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (img.complete || (await img.decode().catch(() => {}))) {
            if (img.naturalWidth === 0) return resolve(null);

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          }
        } catch (e) {
          reject(e);
        }
      })();
    });
  }

  async function fetchImageBlob(url) {
    try {
      const response = await fetch(url);
      return response.ok ? await response.blob() : null;
    } catch (error) {
      // CORS fetch failure — expected for cross-origin images
      return null;
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  // Live config state — kept in sync with chrome.storage so toggling the
  // extension / AI / keywords applies to already-open tabs without a reload.
  let currentKeywords = [];
  let currentSettings = {};
  let observer = null;

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        clearTimeout(timeout);
        func(...args);
      }, wait);
    };
  }

  function isActive(config) {
    const hostname = window.location.hostname;
    return (
      config.settings.enabledGlobal !== false &&
      !config.lists.whitelist.includes(hostname)
    );
  }

  function aiEnabled(settings) {
    return !!(
      settings &&
      settings.aiMode &&
      settings.aiMode !== 'none' &&
      settings.aiConsent
    );
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(
      debounce(() => {
        if (currentKeywords.length > 0 || aiEnabled(currentSettings)) {
          filterContent(currentKeywords, currentSettings);
        }
      }, 500)
    );
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // Apply a freshly-read config: update live state and (re-)run filtering.
  // Note: disabling does not un-hide already-hidden content (see Sprint 5.1) —
  // a reload is still needed to fully restore. This only stops further hiding.
  async function applyConfig(config) {
    if (!isActive(config)) {
      stopObserver();
      console.debug('Orange Filter: Disabled for this site');
      return;
    }

    currentSettings = config.settings;
    currentKeywords = config.lists.userKeywords || [];

    // Run if EITHER filter is active: keywords (text/caption) OR AI (images).
    // This is what makes text-only, image-only, and both-on all work.
    if (currentKeywords.length > 0 || aiEnabled(currentSettings)) {
      await filterContent(currentKeywords, currentSettings);
      startObserver();
    } else {
      stopObserver();
    }
  }

  async function init() {
    try {
      await applyConfig(await loadConfig());

      // Re-read settings live. Ignore stats-only writes (updateStats fires on
      // every hide) to avoid a feedback loop; only settings/lists edits re-apply.
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== 'local') return;
          if (!changes.settings && !changes.lists) return;
          loadConfig().then(applyConfig);
        });
      }
    } catch (error) {
      if (!error.message.includes('Extension context invalidated')) {
        console.warn('Orange Filter Init Error:', error);
      }
    }
  }

  window.addEventListener('pagehide', stopObserver);

  init();
})();
