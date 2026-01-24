# plan.md (Execution Backlog)

## 🚦 Current Status

- **Current Phase:** Phase 0 (Foundation Setup)
- **Next Action:** Create Manifest V3 skeleton.

## Phase 0: Foundation Setup

_Backpressure: npm run lint exits 0, Extension loads in Chrome without errors._

- [x] Create Manifest V3 skeleton (`manifest.json`) with `offscreen` permission.
- [x] Setup ESLint + Prettier with pre-commit hooks.
- [x] Create basic test harness (Jest/Puppeteer).
- [x] Implement storage schema with defaults (`lib/storage.js`).
- [ ] Create build script (Webpack/Rollup for bundling models).

## Phase 1: Network Blocking Layer

_Backpressure: Integration test shows blocked URL redirecting to block page._

- [ ] Implement `declarativeNetRequest` rule builder infrastructure.
- [ ] Create Keyword → urlFilter converter logic.
- [ ] Implement Whitelist priority rules (Spec FR-8).
- [ ] Add Service Worker rule updater.
- [ ] Test: Verify URL blocking on `example.com/trump`.

## Phase 2: DOM Content Filtering

_Backpressure: Performance < 100ms per scan on 500 elements._

- [ ] Implement container selector system (`article`, `.card`, etc.).
- [ ] Create text extraction logic (Headlines, Body, Links).
- [ ] Build Keyword Matcher (Case-insensitive + Whole word).
- [ ] Add `MutationObserver` with 500ms debounce.
- [ ] Implement element hiding logic (CSS `display:none` + `data-trump-filter-hidden`).

## Phase 3: Context-Aware Image Filtering (Free Tier)

_Backpressure: Image with "Trump" alt text is hidden._

- [ ] Implement Context Extractor (Alt text, Captions, Parent link).
- [ ] Match context against keywords.
- [ ] Hide images/video posters when context matches.
- [ ] Add placeholder UI for hidden images.

## Phase 4: UI (Popup & Options)

_Backpressure: Settings persist to storage and update active tabs._

- [ ] Create `popup.html` with Global Toggle and Site Exclusion.
- [ ] Create `options.html` with Sensitivity Selector (Light/Balanced/Strict).
- [ ] Implement "Stats" visualization (Items blocked).

## Phase 5: The GPU Worker (Offscreen Infrastructure)

_Backpressure: Offscreen document loads and replies to "ping"._

- [ ] Create `offscreen.html` and `offscreen.js`.
- [ ] Implement `background.js` logic to spawn/manage the Offscreen Document.
- [ ] Implement Messaging Bridge: Content Script -> Background -> Offscreen -> Background -> Content Script.

## Phase 6: Biometric & Concept Filtering (Premium Core)

_Backpressure: Face detected >90% accuracy, SigLIP runs <200ms._

- [ ] **Asset Prep:** Download and bundle `face_embedder.task` (MediaPipe) and `siglip-base-patch16-224-q8` (Transformers.js).
- [ ] **Layer A (Face):** Initialize MediaPipe `FaceEmbedder` in Offscreen.
- [ ] **Layer A (Face):** Create/Load "Trump Reference Vectors" (JSON).
- [ ] **Layer A (Face):** Implement `isTrumpFace()` logic (Cosine Similarity).
- [ ] **Layer B (Concept):** Initialize Transformers.js `pipeline` in Offscreen (WebGPU).
- [ ] **Layer B (Concept):** Implement `scanContext()` logic (Zero-shot classification).
- [ ] **Integration:** Connect Content Script image scanner to the Offscreen Cascade.
- [ ] **Privacy:** Implement "Opt-In" Consent Dialog (GDPR).
