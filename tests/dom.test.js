/**
 * @jest-environment jsdom
 */
import { containsKeywords, scanAndFilter } from '../src/lib/dom';

describe('DOM Filtering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('containsKeywords detects keywords in element text', () => {
    const div = document.createElement('div');
    div.innerText = 'This is a story about Donald Trump.';
    expect(containsKeywords(div, ['trump'])).toBe(true);
    expect(containsKeywords(div, ['biden'])).toBe(false);
  });

  test('scanAndFilter hides matching elements', () => {
    document.body.innerHTML = `
      <article id="match">Trump wins something</article>
      <div class="card" id="no-match">Sky is blue</div>
      <div class="teaser" id="match-2">Breaking news: Trump rally</div>
    `;

    scanAndFilter(['trump']);

    expect(document.getElementById('match').style.display).toBe('none');
    expect(document.getElementById('match').dataset.trumpFilterHidden).toBe(
      'true'
    );
    expect(document.getElementById('no-match').style.display).not.toBe('none');
    expect(document.getElementById('match-2').style.display).toBe('none');
  });

  test('scanAndFilter ignores already hidden elements', () => {
    document.body.innerHTML = '<article id="item">Trump</article>';
    const el = document.getElementById('item');
    el.dataset.trumpFilterHidden = 'true';
    el.style.display = 'block';

    scanAndFilter(['trump']);

    // Should still be block because it was skipped
    expect(el.style.display).toBe('block');
  });

  test('scanAndFilter hides images based on alt text', () => {
    document.body.innerHTML = `
      <img id="bad-img" alt="Donald Trump in Florida" src="trump.jpg">
      <img id="good-img" alt="A cute cat" src="cat.jpg">
    `;

    scanAndFilter(['trump']);

    expect(document.getElementById('bad-img').style.display).toBe('none');
    expect(document.getElementById('good-img').style.display).not.toBe('none');
  });

  test('scanAndFilter hides images based on parent link text', () => {
    // We use a container that is NOT in DEFAULT_SELECTORS to ensure the image itself is what gets hidden
    document.body.innerHTML = `
      <section id="non-matching-container">
        <a href="/news" id="bad-link">
          <img id="context-img" src="photo.jpg">
          <span>Latest Trump News</span>
        </a>
      </section>
    `;

    scanAndFilter(['trump']);

    expect(document.getElementById('context-img').style.display).toBe('none');
  });

  test('scanAndFilter creates a placeholder for hidden images', () => {
    document.body.innerHTML =
      '<img id="img" alt="Trump" src="t.jpg" width="200" height="100">';

    scanAndFilter(['trump']);

    const placeholder = document.querySelector('.trump-filter-placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toBe('Content Filtered');
  });
});
