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
    // Use word boundaries if possible, or simple includes for now
    return lowerText.includes(lowerKeyword);
  });
}

/**
 * Scans the DOM for elements matching selectors and hides them if keywords match.
 * @param {string[]} keywords
 * @param {string[]} customSelectors
 */
export function scanAndFilter(keywords, customSelectors = []) {
  if (!keywords || keywords.length === 0) return;

  const selectors = [...DEFAULT_SELECTORS, ...customSelectors];
  const elements = document.querySelectorAll(selectors.join(', '));

  elements.forEach((el) => {
    if (el.dataset.trumpFilterHidden === 'true') return;

    if (containsKeywords(el, keywords)) {
      el.style.display = 'none';
      el.dataset.trumpFilterHidden = 'true';
      console.log('Trump Filter: Hidden an element based on keywords.');
    }
  });
}
