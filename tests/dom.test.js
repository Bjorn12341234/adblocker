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
});
