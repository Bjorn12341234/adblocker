/**
 * DOM Filtering Logic
 */

export const DEFAULT_SELECTORS = [
  'article',
  '.card',
  '.teaser',
  '.story',
  '.sidebar',
  '.post',
  '.content-item',
  'div[role="article"]',
  'div[role="listitem"]',
  '.g', // Google Search Result
  '.b_algo', // Bing Search Result
];

/**
 * Checks if an element or its children contains any of the keywords.
 * @param {Element} element
 * @param {string[]} keywords
 * @returns {boolean}
 */
export function containsKeywords(element, keywords) {
  if (!keywords || keywords.length === 0) return false;

  const text = element.innerText || element.textContent || '';
  const lowerText = text.toLowerCase();

  return keywords.some((keyword) => {
    if (!keyword) return false;
    const lowerKeyword = keyword.toLowerCase();
    return lowerText.includes(lowerKeyword);
  });
}

/**
 * Extracts context text from an image element (alt, title, surrounding text).
 * @param {HTMLImageElement} img
 * @returns {string}
 */
export function getImageContext(img) {
  let context = (img.alt || '') + ' ' + (img.title || '');

  // Look at parent link text or nearest caption
  const parentLink = img.closest('a');
  if (parentLink) {
    context += ' ' + (parentLink.innerText || parentLink.textContent || '');
  }

  const figure = img.closest('figure');
  if (figure) {
    const figcaption = figure.querySelector('figcaption');
    if (figcaption) {
      context += ' ' + (figcaption.innerText || figcaption.textContent || '');
    }
  }

  return context.trim();
}

/**
 * Scans the DOM for elements matching selectors and hides them if keywords match.
 * @param {string[]} keywords
 * @param {Object} settings
 * @param {string[]} customSelectors
 */
export async function scanAndFilter(
  keywords,
  settings = {},
  customSelectors = []
) {
  if (!keywords || keywords.length === 0) return;

  // 1. Filter Container Elements (Layer 1)
  const selectors = [...DEFAULT_SELECTORS, ...customSelectors];
  const elements = document.querySelectorAll(selectors.join(', '));

  elements.forEach((el) => {
    if (el.dataset.trumpFilterHidden === 'true') return;

    if (containsKeywords(el, keywords)) {
      hideElement(el, 'Container matched keywords');
    }
  });

  // 2. Filter Images (Layer 3 - Contextual)
  const images = document.querySelectorAll(
    'img:not([data-trump-filter-hidden="true"]):not([data-trump-filter-revealed="true"])'
  );

  const imagesToScanAI = [];

  images.forEach((img) => {
    // Check if parent container is already hidden by us
    if (img.closest('[data-trump-filter-hidden="true"]')) return;

    const context = getImageContext(img);
    if (keywords.some((k) => context.toLowerCase().includes(k.toLowerCase()))) {
      hideElement(img, 'Image context matched keywords');
    } else if (
      settings.aiMode &&
      settings.aiMode !== 'none' &&
      settings.aiConsent &&
      !img.dataset.trumpFilterScanning
    ) {
      // Mark for AI Scanning (Layer 2)
      imagesToScanAI.push(img);
    }
  });

  if (imagesToScanAI.length > 0) {
    scanImagesAI(imagesToScanAI, settings);
  }
}

/**
 * Fetches an image URL and returns it as a Blob.
 * @param {string} url
 * @returns {Promise<Blob|null>}
 */
async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    // console.warn('Content Script fetch failed for:', url, error);
    return null;
  }
}

import { incrementBlockedCount } from './stats';

/**
 * Safely sends a message to the background script, handling 'Extension context invalidated' errors.
 * @param {Object} message
 * @returns {Promise<Object|null>}
 */
async function safeSendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      // console.warn('Trump Filter: Extension context invalidated. Reload page to resume filtering.');
      return null;
    }
    throw error;
  }
}

/**
 * Sends images to the background for AI analysis
 * Uses a concurrency limit to prevent overwhelming the background/offscreen worker.
 */
async function scanImagesAI(images, settings) {
  const CONCURRENCY_LIMIT = 3;
  const queue = [...images];

  const processNext = async () => {
    if (queue.length === 0) return;

    const img = queue.shift();

    // Skip if already scanning or small images (re-check)
    if (img.dataset.trumpFilterScanning || img.width < 50 || img.height < 50) {
      return processNext();
    }

    // Check if src is valid
    const src = img.currentSrc || img.src;
    if (!src) {
      return processNext();
    }

    img.dataset.trumpFilterScanning = 'true';

    try {
      let blob = null;

      // Handle data URLs or fetch remote
      if (src.startsWith('data:')) {
        const res = await fetch(src);
        blob = await res.blob();
      } else {
        blob = await fetchImageAsBlob(src);
      }

      const payload = {
        url: src,
        sensitivity: settings.sensitivity || 'balanced',
      };

      // Send as Base64 (more reliable than Blob in some MV3 versions)
      if (blob) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        payload.data = await base64Promise;
        payload.type = 'base64';
      }

      const response = await safeSendMessage({
        target: 'background',
        type: 'CHECK_IMAGE',
        data: payload,
      });

      if (response && response.success) {
        const confidencePct = Math.round(response.confidence * 100);
        if (response.isBlocked) {
          hideElement(img, `AI detected ${response.layer} (${confidencePct}%)`);
        } else if (response.confidence > 0.65) {
          // Grey Zone: Blur instead of hide
          blurElement(img, `AI low-confidence match (${confidencePct}%)`);
        }
      }
    } catch (error) {
      console.error('Error scanning image with AI:', error);
    } finally {
      delete img.dataset.trumpFilterScanning;
      processNext();
    }
  };

  // Start initial batch
  for (let i = 0; i < CONCURRENCY_LIMIT && i < images.length; i++) {
    processNext();
  }
}

function hideElement(el, reason) {
  if (el.tagName === 'IMG') {
    const placeholder = createPlaceholder(el, reason);
    el.parentNode.insertBefore(placeholder, el);
    el.style.display = 'none';
  } else {
    el.style.display = 'none';
  }
  el.dataset.trumpFilterHidden = 'true';
  console.log(`Trump Filter: Hidden an element (${reason}).`);

  // Track stats
  incrementBlockedCount(1);
}

export function blurElement(el, reason) {
  el.style.filter = 'blur(20px)';
  el.style.cursor = 'pointer';
  el.title = `Filtered: ${reason} (Click to show / Right-click to report)`;
  el.dataset.trumpFilterHidden = 'true'; // Count as hidden for mutation observer purposes

  el.addEventListener('click', function onClick(e) {
    e.stopPropagation();
    el.style.filter = '';
    el.style.cursor = '';
    el.title = '';
    el.dataset.trumpFilterHidden = 'false';
    el.dataset.trumpFilterRevealed = 'true';
    el.removeEventListener('click', onClick);
  });

  el.addEventListener('contextmenu', function onRightClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Report this image as a False Positive?')) {
      console.log(
        `Trump Filter: User reported false positive (blur) for ${el.src || el.currentSrc}. Reason: ${reason}`
      );
      el.click(); // Reveal it too
    }
  });

  console.log(`Trump Filter: Blurred an element (${reason}).`);
  incrementBlockedCount(1);
}

function createPlaceholder(img, reason) {
  const placeholder = document.createElement('div');
  placeholder.className = 'trump-filter-placeholder';
  placeholder.title = `Filtered: ${reason}`;

  // Copy relevant styles for layout preservation
  const styles = window.getComputedStyle(img);
  const width = img.naturalWidth || img.width || parseInt(styles.width);
  const height = img.naturalHeight || img.height || parseInt(styles.height);

  // Set dimensions
  placeholder.style.width =
    styles.width !== '0px' ? styles.width : width ? width + 'px' : '100%';

  if (width && height) {
    placeholder.style.aspectRatio = `${width} / ${height}`;
    placeholder.style.height = 'auto';
  } else {
    placeholder.style.height =
      styles.height !== '0px' ? styles.height : '150px';
  }

  placeholder.style.display =
    styles.display === 'inline' ? 'inline-block' : styles.display;

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
      `Trump Filter: User reported false positive for ${img.src || img.currentSrc}. Reason: ${reason}`
    );
    placeholder.click();
    alert('Thank you for your report! (Logged to console)');
  });
  placeholder.appendChild(report);

  placeholder.addEventListener('click', (e) => {
    e.stopPropagation();
    placeholder.remove();
    img.style.display = '';
    img.dataset.trumpFilterHidden = 'false';
    img.dataset.trumpFilterRevealed = 'true';
  });

  return placeholder;
}
