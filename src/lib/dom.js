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
 * @param {string[]} customSelectors
 */
export function scanAndFilter(keywords, customSelectors = []) {
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
    'img:not([data-trump-filter-hidden="true"])'
  );
  images.forEach((img) => {
    // Check if parent container is already hidden by us
    if (img.closest('[data-trump-filter-hidden="true"]')) return;

    const context = getImageContext(img);
    if (keywords.some((k) => context.toLowerCase().includes(k.toLowerCase()))) {
      hideElement(img, 'Image context matched keywords');
    }
  });
}

function hideElement(el, reason) {
  if (el.tagName === 'IMG') {
    const placeholder = createPlaceholder(el);
    el.parentNode.insertBefore(placeholder, el);
    el.style.display = 'none';
  } else {
    el.style.display = 'none';
  }
  el.dataset.trumpFilterHidden = 'true';
  console.log(`Trump Filter: Hidden an element (${reason}).`);
}

function createPlaceholder(img) {
  const placeholder = document.createElement('div');
  placeholder.className = 'trump-filter-placeholder';

  // Copy relevant styles for layout preservation
  const styles = window.getComputedStyle(img);
  placeholder.style.width =
    styles.width !== '0px'
      ? styles.width
      : img.width
        ? img.width + 'px'
        : '100%';
  placeholder.style.height =
    styles.height !== '0px'
      ? styles.height
      : img.height
        ? img.height + 'px'
        : '150px';
  placeholder.style.display =
    styles.display === 'inline' ? 'inline-block' : styles.display;

  placeholder.style.backgroundColor = '#f0f0f0';
  placeholder.style.border = '1px solid #ccc';
  placeholder.style.color = '#666';
  placeholder.style.display = 'flex';
  placeholder.style.alignItems = 'center';
  placeholder.style.justifyContent = 'center';
  placeholder.style.fontSize = '12px';
  placeholder.style.fontFamily = 'sans-serif';
  placeholder.style.textAlign = 'center';
  placeholder.textContent = 'Content Filtered';

  return placeholder;
}
