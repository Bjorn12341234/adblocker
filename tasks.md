Bra att veta ungefär hur mycket man skall lägga på vilken del när man beställer tjänster eller liknande - Estimering
Budget Ungefärlig på varje moment - Just nu - Realistiskt
Justering efter behov
Uppläggning av extension på Play Store
$5
Videokampanj, YouTube
6 000 - 8 000 kr
Stockvideos
800 - 3 000 kr
Röstdubb
1 000 - 1 500 kr eller hemmadubb
Fiverr, videoklipp
1 500 - 4 000 kr
Klippning
2 000 - 4 000 kr
Färggradering av klipp
1 500 - 3 000 kr

---

Inte tagit hänsyn till
Finjustering av hemsidan - Om det tillför något - T.ex. stockbilder eller logo - Ser redan bra ut
Kontakta min kompis, som är marknadföringsschef, van vid kampanjer, foto, video och digital marknadsföring (Jennie) - Om det behövs eller tillför något
Domän till hemsida (https://bjorn12341234.github.io/adblocker/) - om det behövs
Sätt upp donationsmöjligheter Fixat
Verifiera att donation och betalning för extensionen funkar
Nämna för vänner, bekanta / social umgängeskrets

---

WHAT TO DO NEXT
Technical review completed 2026-02-03.

## RELEASE STATUS: NOT READY - 3 CRITICAL FIXES REQUIRED

### CRITICAL FIXES (Must do before Chrome Store submission)

- [ ] **Change aiConsent default to false**
  - File: `src/lib/storage.js` line 7
  - Change: `aiConsent: true` → `aiConsent: false`
  - Reason: GDPR/privacy compliance - explicit opt-in required

- [ ] **Create Privacy Policy**
  - Create PRIVACY.md or add to website
  - Must explain: local-only processing, no data sharing, no telemetry
  - Required for Chrome Web Store submission

### HIGH PRIORITY (Should fix)

- [ ] Add input validation for domains/keywords in `src/options/options.js`
- [ ] Reduce model status polling from 2000ms to 5000ms in `src/popup/popup.js:56`

### AFTER FIXES - RELEASE CHECKLIST

- [ ] Run `npm run lint` and fix any issues
- [ ] Run `npm test` and ensure all tests pass
- [ ] Run `npm run build`
- [ ] Test manually in Chrome with "Load unpacked"
- [ ] Create new zip of dist/ folder
- [ ] Submit to Chrome Web Store with privacy policy

---

## TECHNICAL REVIEW SUMMARY

**Overall Assessment: PRODUCTION-READY with minor corrections**

### Strengths

- Clean modular architecture (1,053 lines of source)
- Proper Manifest V3 implementation
- Three-layer filtering: Network rules → DOM scanning → AI image classification
- Excellent error handling and CORS-aware image processing
- No security vulnerabilities found
- All data processed locally, no external telemetry
- Good test coverage with Jest

### Architecture

```
src/
├── background.js      (Service worker - rule management, messaging)
├── content.js         (Page injection - DOM scanning)
├── popup/             (Extension popup UI)
├── options/           (Settings page)
├── offscreen/         (TensorFlow.js ML worker - isolated)
└── lib/               (Core logic - dom.js, storage.js, rules.js)
```

### Performance

- Debounced DOM observation (500ms)
- Concurrent image processing limit (3 images)
- Offscreen document for ML processing (doesn't block pages)
- Auto-closes ML worker after 30s inactivity

### Store Compliance

- Manifest V3: ✓
- Permissions justified: ✓
- No malware patterns: ✓
- Privacy policy: ✗ MISSING
- Default "trump" keyword: ✓ (expected for this product)
