/**
 * Live AI-pipeline diagnostic. Loads the built dist/ extension in real Chrome,
 * seeds storage (keyword + AI on), drops an UNCAPTIONED Trump image on a page so
 * it must go through the AI path, and captures:
 *   - content-script console (page)
 *   - background service-worker console
 *   - offscreen-document console (model load / WASM / predict)
 *   - the data-orange-filter-debug verdict stamped on the image
 *
 * Run: node scripts/diagnose_ai.js
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXT = path.resolve(__dirname, '../dist');
const TRUMP_DATAURL =
  'data:image/jpeg;base64,' +
  fs.readFileSync(
    path.resolve(__dirname, '../tests/assets/orange_small.jpg'),
    'base64'
  );

const PAGE_HTML = `<!doctype html><html><body><h1>diag</h1>
  <img id="t" width="300" height="300" src="${TRUMP_DATAURL}">
</body></html>`;

const log = (...a) => console.log(...a);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-sandbox',
    ],
  });

  // Capture console from every target (page, service worker, offscreen).
  const attach = async (target) => {
    const type = target.type();
    try {
      if (type === 'service_worker' || type === 'worker') {
        const w = await target.worker();
        if (w) w.on('console', (m) => log(`[SW] ${m.text()}`));
      } else {
        const p = await target.page();
        if (p) {
          const tag = target.url().includes('offscreen') ? 'OFFSCREEN' : 'PAGE';
          p.on('console', (m) => log(`[${tag}] ${m.text()}`));
          p.on('pageerror', (e) => log(`[${tag} ERROR] ${e.message}`));
        }
      }
    } catch (e) {
      /* some targets can't be attached */
    }
  };
  browser.on('targetcreated', attach);
  for (const t of browser.targets()) await attach(t);

  // Wait for the service worker, then seed storage.
  log('Waiting for service worker...');
  const swTarget = await browser.waitForTarget(
    (t) => t.type() === 'service_worker',
    { timeout: 30000 }
  );
  const sw = await swTarget.worker();
  await sw.evaluate(async () => {
    await chrome.storage.local.set({
      version: 2,
      settings: {
        enabledGlobal: true,
        sensitivity: 'strict',
        aiMode: 'mobilenet',
        aiConsent: true,
      },
      lists: { whitelist: [], userKeywords: ['trump'] },
    });
  });
  log('Storage seeded: keyword "trump", AI on (strict).');

  const page = await browser.newPage();
  page.on('console', (m) => log(`[PAGE] ${m.text()}`));
  page.on('pageerror', (e) => log(`[PAGE ERROR] ${e.message}`));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().startsWith('http://orange.test/'))
      req.respond({ status: 200, contentType: 'text/html', body: PAGE_HTML });
    else req.continue();
  });

  log('Navigating to test page (uncaptioned Trump image)...');
  await page.goto('http://orange.test/diag', { waitUntil: 'domcontentloaded' });

  // Poll up to 30s for the AI verdict the content script stamps on the image.
  let debug = null;
  for (let i = 0; i < 30; i++) {
    debug = await page.evaluate(() => {
      const img = document.getElementById('t');
      return {
        debug: img.dataset.orangeFilterDebug || null,
        hidden: img.dataset.orangeFilterHidden || null,
        display: img.style.display,
        blur: img.style.filter || null,
      };
    });
    if (debug.debug || debug.hidden) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  log('\n===== RESULT =====');
  log(JSON.stringify(debug, null, 2));
  log('==================\n');

  await browser.close();
})().catch((e) => {
  console.error('HARNESS ERROR:', e);
  process.exit(1);
});
