# The Orange Filter

A privacy-first Chrome Extension that filters specific topics (default: "Orange") from your browsing feed using Network blocking, DOM text analysis, and local AI image processing.

## 🚀 How to Run (Install in Chrome)

1.  **Build the Project:**
    Ensure you have the latest build.

    ```bash
    npm run build
    ```

2.  **Load into Chrome:**
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable **Developer mode** (toggle in the top right).
    - Click **Load unpacked**.
    - Select the **`dist`** folder inside this project directory (`/home/bjorn/projects/adblocker/dist`).

## 🎮 How to Test

### Manual Testing

1.  **Basic Filtering:**
    - Go to a website containing the keyword "Orange" (e.g., a news site or Wikipedia).
    - Observe that articles or paragraphs containing the keyword are hidden (or replaced with a placeholder).
    - Click the extension icon in the toolbar to see the blocked item count.

2.  **AI Image Filtering (Premium/Experimental):**
    - Click the extension icon to open the **Popup**.
    - Toggle **"AI Image Filtering"** ON.
    - Accept the **Privacy Consent** dialog (required for local AI processing).
    - Reload the page. Images matching the "Orange" face vectors or context should now be scanned and hidden if they match.
    - _Note:_ The first run might take a moment to initialize the offscreen document.

### Automated Testing

Run the included unit and integration tests:

```bash
npm test
```

## 🛠️ Development

- **Watch Mode:** `npm run watch` (Rebuilds on file changes).
- **Linting:** `npm run lint` (Checks code style).
