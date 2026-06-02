# The Orange Filter — Findings & Fix Plan

_Last updated: 2026-06-01. Combines a code review (commit `3cf4238`, v1.0.1) with a
**live in-browser test run** of the shipped extension on Fox News, Google Images,
and SVT.se, plus controlled image-injection tests of the AI pipeline._

> **Product goal (the lens for everything below):** this is a **Trump filter**. It
> must filter Trump **visually**, not just by text. Today it is effectively a
> keyword filter — the AI contributes nothing. The top priority is making the AI
> actually work.

---

## TL;DR

| Area                                   | State           | Verdict                                     |
| -------------------------------------- | --------------- | ------------------------------------------- |
| Keyword/text + image-context filtering | Working         | Effective where selectors match             |
| **AI image classification**            | **Never fires** | **0 detections across the whole test run**  |
| Options page "Enable AI" checkbox      | **Dead**        | Wired to nothing — checking it does nothing |
| Keyword matching precision             | **Buggy**       | Substring match → ~40% false hides on Fox   |
| Enable/disable toggle                  | Working         | Clean on/off, content restores              |
| Per-site coverage                      | Brittle         | Depends on hardcoded selectors              |

---

## 🔴 Live-test findings (new this session)

### A. The AI never fires — it is _not_ a working visual filter

Across the entire run the AI hid **zero** images:

- Google Images `trump`: **361 placeholders, 100% `"Image context match"`, 0 AI, 0 blur.**
- Google Images `trump portrait`: 321 hides, all context, 0 AI.
- Controlled test: injected real, **uncaptioned** Trump photos (blank `alt`, no link,
  `data:` URLs to bypass CORS) — the AI **never even queued them** (`everScanned: false`).

Two stacked causes:

1. **The AI is gated as a last resort.** In `content.js` (and the mirror `lib/dom.js:105-125`)
   every image goes through keyword/image-context match first; only images with **no
   keyword anywhere nearby** reach the AI (`content.js:269` returns before queuing).
   On any Trump page the captions contain "Trump", so the keyword path hides
   everything and the AI is never consulted.
2. **When the AI path _was_ reached** (observed `scanning: 3` on the first run, before
   settings were touched), it still produced **0 hides** — so when it does run it
   either errors or scores every Trump photo below threshold. **Root cause of this is
   still unconfirmed** (need the offscreen console or a direct model eval — see Sprint 2).

### B. The options "Enable Local AI Scanning" checkbox is dead code

- `options.html:107` defines `<input type="checkbox" id="aiEnabled">`.
- `options.js` **never references `aiEnabled`** — not in `loadSettings()`, not in
  `saveSettings()`. Saving only writes `sensitivity`, `userKeywords`, `whitelist`.
- The **only** working AI toggle is in the **popup** (`popup.js` sets
  `aiMode = 'mobilenet' | 'none'`).
- **Consequence:** a user who enables AI from the settings page changes nothing. This
  alone makes the AI un-turn-on-able for anyone using the options UI.

### C. Keyword matching is substring-based → heavy false positives

`matchesKeywords` uses `text.includes(keyword)` with **no word boundaries**. On Fox,
**8 of 20 hidden stories were false positives, all from the single keyword `war`:**

| Wrongly hidden                               | `war` matched inside |
| -------------------------------------------- | -------------------- |
| "Windows 11… **softwar**e on sale"           | soft**war**e         |
| "Cruise ship **stewar**d shocked by $5K tip" | ste**war**d          |
| "Rod **Stewar**t cancels concert"            | Ste**war**t          |
| "Pope Leo XIV's AI **war**ning"              | **war**ning          |
| "Experts **war**n…"                          | **war**n             |
| "Platner… private **war**ning"               | **war**ning          |
| "Pastor… **war**ns of free speech"           | **war**ns            |
| "Picture of health…"                         | (war-substring word) |

Short keywords (`war`, `iran`, `krig`) will keep nuking software/Stewart/warning/warm/
toward/award/Warren, etc. The other 12 Fox hides were correct (real Trump/Iran/Donald).
**(This corrects the earlier "recycled DOM node" theory — verified against all 20
elements: 0 were unexplained by the real keyword list.)**

### D. Content script reads settings once, at init

The content script captures `config.settings` at page load and reuses it in the
MutationObserver closure. Toggling AI or editing keywords **does not affect already-open
tabs** until reload — confusing during use and testing.

### E. What works

- Enable/disable is clean: extension off → 0 hides, all content restored, no layout damage.
- Image-context filtering is genuinely effective on captioned pages.
- SVT.se: 2 hides, both intended (a real Trump headline + an Iran story, given the
  user's keyword list) — non-US sites do get filtered when selectors match.

---

## 🟡 Carry-over findings from the code review (still valid)

1. **`content.js` ↔ `lib/dom.js` are diverged duplicates.** `content.js` is what ships
   (webpack entry, self-contained IIFE); the tests exercise `lib/dom.js`, which is never
   bundled. Green tests don't cover shipped code. Both copies share the AI-starvation bug.
2. **Stats writes thrash storage.** `updateStats()` runs per hidden element, reading
   _all_ storage and rewriting the _entire_ config (settings + lists + stats) each time →
   racing increments, badge re-fires.
3. **Hardcoded `EXTRA_KEYWORDS`** are force-injected on every page regardless of settings
   (note: intended as a Trump filter, but they should be visible/removable defaults).
4. **Repo bloat:** `the-orange-filter-toggle/` is a 278 MB committed duplicate; stray root
   `content.js`; committed `dist/`, debug logs; bare `jest.config.js` with no ignore patterns.
5. **MutationObserver re-scans the whole document** every 500 ms on any change — heavy on
   infinite-scroll pages.
6. **`alert()`/`confirm()` in content scripts** block the page (false-positive report flow).
7. **`<all_urls>` host permission + content script** is the #1 driver of slow store review.

---

# Fix plan — Sprints

> Ordered by the product goal: **make the AI work first**, then precision, then health.

## Sprint 1 — Make the AI reachable & controllable (unblock)

_Goal: a user can turn the AI on and the content script honors it, live._

- **1.1** Wire the options AI checkbox. In `options.js`: read `#aiEnabled` in
  `loadSettings()` (`checked = settings.aiMode !== 'none'`), and in `saveSettings()` set
  `settings.aiMode = checked ? 'mobilenet' : 'none'` and `settings.aiConsent = checked`.
- **1.2** Unify the two toggles (popup + options) so they read/write the same
  `aiMode`/`aiConsent` and never disagree.
- **1.3** Make the content script re-read settings on `chrome.storage.onChanged`
  (or re-run filtering) so toggles apply without a reload.
- **1.4** Add a visible "AI active / model loaded" indicator (popup badge or status line)
  so the AI's state is observable instead of silent.

## Sprint 2 — Diagnose & fix the model (does it see Trump?)

_Goal: know whether the model loads-but-misses or errors, then fix accordingly._

> **✅ 2.1 DONE (2026-06-02) — the model is NOT the problem.** Direct Node eval
> (`scripts/eval_model.js`) loads the shipped TM model and runs the _exact_ offscreen
> preprocessing (`resize 224 → /127.5 − 1`). Results on local fixtures:
>
> | Image                               | Orange    | Verdict |
> | ----------------------------------- | --------- | ------- |
> | `orange_small.jpg` (Trump portrait) | **0.994** | BLOCK ✓ |
> | `orange_new.jpg` (Trump)            | **0.966** | BLOCK ✓ |
> | `safe.jpg`                          | 0.059     | pass ✓  |
> | `safe_new.jpg`                      | 0.000     | pass ✓  |
>
> The model **loads cleanly** (rules out **2.3**) and is **highly accurate** on clean
> Trump photos, far above the 0.65 strict threshold (rules out **2.2**). Therefore the
> "AI hides 0 images" symptom is **not** a model problem — it is a **runtime pipeline /
> gating** problem. **Skip 2.2 and 2.3; go to Sprint 3.** The remaining open question is
> the live "scanning:3 but 0 hides" case (B.2): with the model proven good, the suspect is
> the image→base64 path (tainted cross-origin canvas → null data → offscreen gets nothing)
> and/or the keyword gating — not the model. Confirm via 2.4 (stop swallowing errors).

- **2.1** **Direct model eval.** Load `src/assets/models/tm-model/` in Node (or a scratch
  page) and run it against several real Trump photos; record the `Orange` confidence.
  This decides 2.2 vs 2.3. — **DONE, see box above. Harness: `scripts/eval_model.js`.**
- **2.2** _If it loads but scores low/misses:_ the 4-class Teachable Machine model
  (`Orange / Safe / Hard negatives / Class 4`) is too weak. Retrain with a much larger,
  varied dataset + hard negatives — **or** switch to **face detection + face-embedding
  match** against reference Trump photos (far more accurate for a person filter).
- **2.3** _If it errors:_ fix offscreen/model loading (WASM paths, CSP `wasm-unsafe-eval`,
  `loadLayersModel` vs `loadGraphModel`, label index).
- **2.4** ✅ **DONE (2026-06-02).** `scanImagesWithAI` no longer swallows errors: the
  empty `catch {}` now logs the real failure, and **every scanned image is stamped with
  `data-orange-filter-debug`** (JSON: src, whether data was sent inline vs url-only, and
  the model result/error). The image pass also logs `N hidden by caption, M queued for AI`.
  This is the lens for the live test: "0 queued" = starvation; "queued but no block" =
  pipeline/model.

## Sprint 3 — Make the AI actually contribute (architecture)

_Goal: the AI catches Trump images the keyword path can't — uncaptioned photos, memes._

> **🎯 ROOT CAUSE CONFIRMED & FIXED (2026-06-02).** A live Puppeteer run of the real
> extension (`scripts/diagnose_ai.js`) caught the actual failure: every AI scan threw
> **`toFloat is not a function`** inside the offscreen document, swallowed by the old
> `catch {}`. Cause: `offscreen.js` preprocessed with **chained tensor methods**
> (`tensor.toFloat().div(127.5).sub(1).expandDims(0)`), which the production webpack
> bundle of `tfjs-core` does not register. Fixed by switching to functional ops
> (`cast`/`div`/`sub`/`expandDims`) — the exact form the Sprint 2.1 Node harness proved.
> After the fix the same live run scores an uncaptioned Trump photo **0.9946 and hides it**
> (`isBlocked:true`, `display:none`). The AI image filter now works end-to-end in all
> modes (text-only, image-only, both).

- **3.1** ✅ **DONE (2026-06-02).** Also decoupled the AI from the keyword list so
  **image-only mode works** (empty keywords + AI on previously switched the whole pipeline
  off). The image pass now explicitly queues every
  non-caption-matched image for the AI (bare/uncaptioned photos — the AI's actual job),
  and the queue is observable via the log above. The `width < 50` skip now also checks
  `naturalWidth`/`naturalHeight`, so lazy-loaded / just-injected images (the exact case
  that showed `everScanned: false`) are no longer dropped before layout. _Still pending
  live confirmation in-browser — see "How to test 3.1+2.4" below._
- **3.2** Define the AI's job explicitly: catch **bare/uncaptioned** Trump images
  (image search, social feeds, memes) — the gap keywords structurally cannot fill.
- **3.3** Tune thresholds per sensitivity once the model is known-good (currently
  strict=0.65 hide / 0.65 blur in offscreen vs content-side 0.65).
- **3.4** Performance: cap concurrent scans, skip tiny/offscreen images, cache verdicts
  per image src.

## Sprint 4 — Keyword precision (the substring bug)

_Goal: stop hiding software/Stewart/warning._

- **4.1** Replace `text.includes(kw)` with **word-boundary** matching (`\b<kw>\b`,
  case-insensitive, Unicode-aware for Swedish: `krig`, `kriget`).
- **4.2** Decide per-keyword behavior (whole-word default; allow explicit
  phrase/substring if a user wants it).
- **4.3** Re-run the Fox/SVT test; confirm the 8 `war` false positives are gone and the
  12 real hits remain.

## Sprint 5 — Robustness & UX

- **5.1** Container hides never reverse (collapsed `<article>` stays collapsed even if its
  content changes). Add an un-hide/observe path or re-validate on mutation.
- **5.2** Replace `alert()`/`confirm()` with non-blocking inline UI.
- **5.3** MutationObserver: process only the added nodes per record, not a full-document
  rescan every 500 ms.
- **5.4** Coverage: broaden `CONTAINER_SELECTORS` and/or add a generic
  "nearest block ancestor" fallback so filtering isn't tied to hand-coded class names.

## Sprint 6 — Code health (do alongside, lower urgency)

- **6.1** De-dupe `content.js` ↔ `lib/dom.js` so tests cover shipped code (make
  `content.js` import from `lib/`).
- **6.2** Fix stats thrash: in-memory debounced counter; never rewrite settings/lists
  from the stats path.
- **6.3** Repo cleanup: remove the 278 MB `the-orange-filter-toggle/` duplicate, stray
  root `content.js`, committed `dist/`/logs; add `.gitignore`; add jest
  `testPathIgnorePatterns`; split `test:e2e`.
- **6.4** Surface `EXTRA_KEYWORDS` as editable defaults rather than forced constants.

---

## Suggested order to start

1. ~~**Sprint 1** (1.1 + 1.3)~~ — ✅ DONE (commit `56e04ca`). AI is now turn-on-able and
   settings apply live.
2. ~~**Sprint 2.1**~~ — ✅ DONE. Model is known-good (0.99 on Trump). Plan forks to **Sprint 3**
   (pipeline/gating), not a model rebuild.
3. **Sprint 3** — the real "make it a visual filter" work: stop the keyword path starving the
   AI (3.1) and fix the runtime image→base64/offscreen path so it actually hides. **← NEXT.**
4. **Sprint 4.1** — one-line-ish win, removes the most visible `war` false positives.

---

## Test evidence (this run)

- Fox News: 20 hidden = 12 intended + 8 substring false positives (all `war`). Toggle off → 0.
- Google Images `trump`: 361 hides, all `Image context match`, 0 AI, 0 blur.
- Google Images `trump portrait`: 321 hides, all context, 0 AI.
- SVT.se: 2 hides, both intended (Trump + Iran).
- Injected uncaptioned Trump `data:` images (×3): never scanned by AI (`everScanned: false`).
- Could **not** inspect `chrome://extensions`, the popup, or the offscreen/service-worker
  console — the browser-automation tool is sandboxed off Chrome's internal pages. The
  offscreen console (model load logs) needs a manual paste, or use Sprint 2.1 instead.

---

## How to test 3.1 + 2.4 locally (next manual run)

1. `npm run build`, then load **unpacked** `dist/` at `chrome://extensions` (Developer mode).
2. Make sure AI is on (popup toggle, or Options → Enable Local AI Scanning — now wired).
3. Open a Trump-heavy page (Google Images `trump`) and open **DevTools → Console** on the
   page. Look for `[OrangeFilter] image pass: X hidden by caption, Y queued for AI`.
   - **Y = 0** → still starved (captions catch everything); the AI's real test is an
     uncaptioned page / injected `data:` images.
   - **Y > 0** → AI is running; watch for `AI scan error` / `AI scan returned no block`.
4. Inspect any scanned `<img>` for `data-orange-filter-debug` — it now carries the model
   result (or the error). `sentData: "url-only"` means the background fetched it; an
   `error` field means the scan genuinely failed (the previously-hidden case).
5. To eval the model offline without Chrome: `node scripts/eval_model.js [imgs...]`.
