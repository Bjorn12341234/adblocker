# context.md

## 🤖 The Ralph Coding Methodology
**Active Protocol:** Autonomous Iterative Loop (Ralph Loop).

You are an intelligent agent operating in a loop. Your memory is file-based. You do not rely on conversation history for technical details; you rely on these three files:
1. **context.md** (This file): High-level goals, methodology, and constraints.
2. **plan.md**: The source of truth for progress. It contains the backlog and current status.
3. **spec.md**: The source of truth for requirements. It defines technical implementation details.

### Your Workflow Loop
For every iteration, you must:
1. **READ** `plan.md` to find the first unchecked item (`- [ ]`) in the active Phase.
2. **READ** `spec.md` to understand the technical constraints for that specific item.
3. **EXECUTE** the task (Generate code, write tests, or create assets).
4. **VERIFY** via Backpressure (Lint, Test, Browser Load).
5. **UPDATE** `plan.md`: Mark the task as completed (`- [x]`).
6. **STOP**. Do not attempt multiple phases in one go. Small, atomic commits.

---

## 🛡️ Core Constraints (Non-Negotiable)
**Security & Privacy Red Lines**
* ❌ NO remote code execution (CSP `unsafe-eval` forbidden).
* ❌ NO data exfiltration to external servers.
* ❌ NO cloud-based inference.
* ❌ NO CDN loading for Models (Must be bundled locally).
* ✅ **Architecture:** Heavy AI runs in an **Offscreen Document**, not the Service Worker.
* ✅ **Biometric Scope:** Local-only identification using pre-calculated reference vectors.

**Definition of Done**
A task is done when:
* The code exists and follows the `spec.md`.
* The `plan.md` entry is marked with `[x]`.
* Tests (if applicable) pass.
* Linter passes with no errors.

---

## 📦 Product Context
**Product:** Trump Filter (Chrome Extension - Manifest V3)
**Core Value:** Privacy-first topic filtering (Text & Image) with Local AI.

**Problem Statement**
Users experience content fatigue. They want control over what topics AND IMAGES appear in their feed without leaving their favorite news sites.

**Solution (The Cascade Architecture)**
1.  **Network (Layer 0):** Blocks Trump-related URLs before page loads.
2.  **DOM (Layer 1):** Hides Trump-related articles/cards on pages via text analysis.
3.  **Premium (Layer 2 - The Cascade):**
    * *Step A (Fast):* **MediaPipe Face Embedder** detects faces and compares against local Trump vectors (15ms).
    * *Step B (Smart):* **SigLIP** (Transformers.js) analyzes context/content only if "Strict Mode" is enabled (150ms).

**Architecture Principles**
* **Privacy Over Features:** If it requires data exfiltration, we don't build it.
* **Local Over Cloud:** All models (MediaPipe .task, ONNX .quant) must be bundled and run via WebGPU/Wasm.
* **Resource Efficiency:** Use the "Cascade" to avoid running heavy SigLIP models on every image.
