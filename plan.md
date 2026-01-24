# plan.md (Execution Backlog)

## 🚦 Current Status
* **Current Phase:** Phase 0 (Foundation Setup)
* **Next Action:** Create Manifest V3 skeleton.

## Phase 0: Foundation Setup
*Backpressure: npm run lint exits 0, Extension loads in Chrome without errors.*

- [ ] Create Manifest V3 skeleton (`manifest.json`) with `offscreen` permission.
- [ ] Setup ESLint + Prettier with pre-commit hooks.
- [ ] Create basic test harness (Jest/Puppeteer).
- [ ] Implement storage schema with defaults (`lib/storage.js`).
- [ ] Create build script (Webpack/Rollup for bundling models).

## Phase 1: Network Blocking Layer
*Backpressure: Integration test shows blocked URL redirecting to block page.*

- [ ] Implement `declarativeNetRequest` rule builder infrastructure.
- [ ] Create Keyword → urlFilter converter logic.
- [ ] Implement Whitelist priority rules (Spec FR-8).
- [ ] Add Service Worker rule updater.
- [ ] Test: Verify URL blocking on `example.com/trump`.

## Phase 2: DOM Content Filtering
*Backpressure: Performance < 100ms per scan on 500 elements.*

- [ ] Implement container selector system (`article`, `.card`, etc.).
- [ ] Create text extraction logic (Headlines, Body, Links).
- [ ] Build Keyword Matcher (Case-insensitive + Whole word).
- [ ] Add `MutationObserver` with 500ms debounce.
- [ ] Implement element hiding logic (CSS `display:none` + `data-trump-filter-hidden`).

## Phase 3: Context-Aware Image Filtering (Free Tier)
*Backpressure: Image with "Trump" alt text is hidden.*

- [ ] Implement Context Extractor (Alt text, Captions, Parent link).
- [ ] Match context against keywords.
- [ ] Hide images/video posters when context matches.
- [ ] Add placeholder UI for hidden images.

## Phase 4: UI (Popup & Options)
*Backpressure: Settings persist to storage and update active tabs.*

- [ ] Create `popup.html` with Global Toggle and Site Exclusion.
- [ ] Create `options.html` with Sensitivity Selector (Light/Balanced/Strict).
- [ ] Implement "Stats" visualization (Items blocked).

## Phase 5: The GPU Worker (Offscreen Infrastructure)
*Backpressure: Offscreen document loads and replies to "ping".*

- [ ] Create `offscreen.html` and `offscreen.js`.
- [ ] Implement `background.js` logic to spawn/manage the Offscreen Document.
- [ ] Implement Messaging Bridge: Content Script -> Background -> Offscreen -> Background -> Content Script.

## Phase 6: Biometric & Concept Filtering (Premium Core)
*Backpressure: Face detected >90% accuracy, SigLIP runs <200ms.*

- [ ] **Asset Prep:** Download and bundle `face_embedder.task` (MediaPipe) and `siglip-base-patch16-224-q8` (Transformers.js).
- [ ] **Layer A (Face):** Initialize MediaPipe `FaceEmbedder` in Offscreen.
- [ ] **Layer A (Face):** Create/Load "Trump Reference Vectors" (JSON).
- [ ] **Layer A (Face):** Implement `isTrumpFace()` logic (Cosine Similarity).
- [ ] **Layer B (Concept):** Initialize Transformers.js `pipeline` in Offscreen (WebGPU).
- [ ] **Layer B (Concept):** Implement `scanContext()` logic (Zero-shot classification).
- [ ] **Integration:** Connect Content Script image scanner to the Offscreen Cascade.
- [ ] **Privacy:** Implement "Opt-In" Consent Dialog (GDPR).
