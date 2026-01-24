# plan.md (Execution Backlog)

## 🚦 Current Status

- **Current Phase:** Phase 8: Robustness & Data Flow
- **Next Action:** Optimize Data Transport.

## Phase 0: Foundation Setup

_Backpressure: npm run lint exits 0, Extension loads in Chrome without errors._

- [x] Create Manifest V3 skeleton (`manifest.json`) with `offscreen` permission.
- [x] Setup ESLint + Prettier with pre-commit hooks.
- [x] Create basic test harness (Jest/Puppeteer).
- [x] Implement storage schema with defaults (`lib/storage.js`).
- [x] Create build script (Webpack/Rollup for bundling models).

## Phase 1: Network Blocking Layer

_Backpressure: Integration test shows blocked URL redirecting to block page._

- [x] Implement `declarativeNetRequest` rule builder infrastructure.
- [x] Create Keyword → urlFilter converter logic.
- [x] Implement Whitelist priority rules (Spec FR-8).
- [x] Add Service Worker rule updater.
- [x] Test: Verify URL blocking on `example.com/trump`.

## Phase 2: DOM Content Filtering

_Backpressure: Performance < 100ms per scan on 500 elements._

- [x] Implement container selector system (`article`, `.card`, etc.).
- [x] Create text extraction logic (Headlines, Body, Links).
- [x] Build Keyword Matcher (Case-insensitive + Whole word).
- [x] Add `MutationObserver` with 500ms debounce.
- [x] Implement element hiding logic (CSS `display:none` + `data-trump-filter-hidden`).

## Phase 3: Context-Aware Image Filtering (Free Tier)

_Backpressure: Image with "Trump" alt text is hidden._

- [x] Implement Context Extractor (Alt text, Captions, Parent link).
- [x] Match context against keywords.
- [x] Hide images/video posters when context matches.
- [x] Add placeholder UI for hidden images.

## Phase 4: UI (Popup & Options)

_Backpressure: Settings persist to storage and update active tabs._

- [x] Create `popup.html` with Global Toggle and Site Exclusion.
- [x] Create `options.html` with Sensitivity Selector (Light/Balanced/Strict).
- [x] Implement "Stats" visualization (Items blocked).

## Phase 5: The GPU Worker (Offscreen Infrastructure)

_Backpressure: Offscreen document loads and replies to "ping"._

- [x] Create `offscreen.html` and `offscreen.js`.
- [x] Implement `background.js` logic to spawn/manage the Offscreen Document.
- [x] Implement Messaging Bridge: Content Script -> Background -> Offscreen -> Background -> Content Script.

## Phase 6: Visual Classification (MobileNet) - V1 Core

_Backpressure: MobileNet runs < 100ms, Bundle size < 15MB._

- [x] **Acquire Model:** Train & Download `model.json` + `weights.bin` (Trump vs Safe) via Teachable Machine.
- [x] **Install Engine:** Add `tensorflow/tfjs` or `tfjs-tflite`.
- [x] **Implement Logic:** Replace complex Cascade code in `offscreen.js` with simple TFJS `model.predict()`.
- [x] **Cleanup:** Disable/Comment out MediaPipe Face detection code (Save for V2).

## Phase 7: Performance & Stability Hardening

_Backpressure: No memory leaks, Offscreen closes after 30s._

- [x] **Debug Architecture:** Create `scripts/debug_extension.js` to run extension in Puppeteer with WebGPU enabled and log forwarding.
- [x] **Fix Offscreen Lifecycle (NFR-3):** Implement a "Keep-Alive" timer in `backgroundLogic.js`. Close document after 30s of inactivity.
- [x] **Fix Async Loop Bug:** Refactor `scanImagesAI` in `dom.js`. Replace `forEach` (which doesn't await) with `p-limit` or batched `Promise.all` to prevent CPU spikes.
- [ ] **Memory Cleanup:** Add `disconnect()` logic for `MutationObserver` in `content.js` on window unload.

## Phase 8: Robustness & Data Flow

_Backpressure: Images on authenticated sites (e.g., behind logins) are correctly scanned._

- [x] **Refactor Image Fetching (CORS Fix):** Move image fetching from Background (`fetch(url)`) to Content Script (`fetch(url)` -> `Blob`).
- [ ] **Optimize Data Transport:** Switch messaging from Base64 strings (2x memory) to `Blob` / `ArrayBuffer`.
- [ ] **Error Handling Wrapper:** Wrap `chrome.runtime.sendMessage` in `content.js` to catch "Extension Context Invalidated" errors during updates/reloads.

## Phase 9: UX Polish & Observability

_Backpressure: Popup shows real numbers; Placeholders explain *why* content was hidden._

- [ ] **Implement Stats Persistence:** Create `stats.js` lib. Track `blockedCount` in `chrome.storage.local`. Hook up Popup UI to real data.
- [ ] **Smart Placeholders:**
  - Refactor `createPlaceholder` to use aspect-ratio boxes (prevent layout shift).
  - Add Tooltip: Hovering placeholder shows "Blocked by [Face/Context] (Confidence: X%)".
- [ ] **Dynamic Sensitivity:** Wire up `options.html` sensitivity (Light/Balanced/Strict) to actual numerical thresholds in `offscreen.js` (e.g., Strict = 0.5, Balanced = 0.65).

## Phase 10: Automated Quality Assurance

_Backpressure: Full E2E suite passes._

- [ ] **E2E Testing:** Set up Puppeteer to load the extension and visit a local test page with "Trump" images. Verify hiding behavior.

## Future / Icebox (V2)

- [ ] **Face Detection:** Re-enable MediaPipe FaceEmbedder.
- [ ] **Vector Database:** Improve Trump Vector accuracy.
