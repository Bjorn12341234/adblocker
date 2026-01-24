# spec.md (Technical Specifications)

## 1. Overview
A Privacy-First Chrome Extension filtering Trump-related content via Network (URL), DOM (Text), and Local AI (Cascade Image Filter).

## 2. Functional Requirements (FR) - Free Tier

**FR-1: Global & Site Toggles**
* **Storage:** `enabledGlobal: boolean`, `siteDisabled: { [domain]: boolean }`.
* **Logic:** Global OFF disables all. Site OFF disables content script for that host.

**FR-4: URL Blocking**
* **Tech:** `chrome.declarativeNetRequest`.
* **Rule:** Block `main_frame` if URL contains keyword.

**FR-5: DOM Filtering**
* **Selectors:** `article`, `.card`, `.teaser`, `.story`, `.sidebar`.
* **Action:** `style.display = 'none'`, `data-trump-filter-hidden="true"`.

**FR-6: Infinite Scroll**
* **Tech:** `MutationObserver` on `document.body`.
* **Constraint:** Debounce 500ms. Max 1 scan per burst.

## 3. Premium Features (PF) - Paid Tier

**PF-1: The Cascade Architecture (Offscreen)**
* **Infrastructure:**
    * **Host:** `offscreen.html` (Manifest V3 Offscreen Document).
    * **Reason:** `DOM_SCRAPING` (valid reason for ML inference).
* **Layer A: Face Identity (Fast)**
    * **Tech:** MediaPipe Tasks (`FaceEmbedder` w/ Wasm).
    * **Model:** `face_embedder.task` (Bundled, ~5MB).
    * **Logic:**
        1.  Detect faces in image bitmap.
        2.  Generate 128-d embedding.
        3.  Cosine Similarity vs. `trump_vectors.json` (Pre-calculated).
        4.  Threshold: `> 0.6`.
* **Layer B: Concept Context (Smart - Optional)**
    * **Trigger:** Only if "Strict Mode" is ON and Layer A finds no face but context is suspicious.
    * **Tech:** Transformers.js v3 (WebGPU).
    * **Model:** `Xenova/siglip-base-patch16-224` (Quantized q8, ~180MB).
    * **Logic:** Zero-shot classify: `["Donald Trump", "MAGA Rally", "Politics"]`.
* **Messaging:**
    * Content Script sends `base64` or `blob` -> Background -> Offscreen.
    * Offscreen returns `{ isBlocked: boolean, confidence: number }`.

**PF-2: Privacy & Consent**
* **Default:** Features OFF.
* **Action:** User must click "Enable AI Filtering" and accept "Local Compute Only" disclaimer.
* **Data:** NO images leave the browser. NO analytics on specific images.

## 4. Non-Functional Requirements (NFR)
* **NFR-1 (Performance):**
    * Face Check: < 50ms (MediaPipe Wasm).
    * SigLIP Check: < 500ms (WebGPU).
* **NFR-2 (Bundling):**
    * All model assets must be in `assets/models/`.
    * `manifest.json` CSP must allow `wasm-unsafe-eval`.
* **NFR-3 (Battery):**
    * Offscreen document must close after 30s of inactivity to save RAM.

## 6. Data Model
```json
{
  "version": 2,
  "settings": {
    "enabledGlobal": true,
    "sensitivity": "balanced", // light, balanced, strict (enables SigLIP)
    "aiMode": "none", // none, face_only, cascade
    "aiConsent": false
  },
  "lists": {
    "whitelist": ["example.com"],
    "userKeywords": []
  }
}
