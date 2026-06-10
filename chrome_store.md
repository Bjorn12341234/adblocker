# Chrome Web Store Listing — TheOrangeFilter

Kopiera texten under varje rubrik rakt in i motsvarande fält.

---

## Store Listing

### Name

TheOrangeFilter

### Summary (short description, max 132 tecken)

Hide web content based on keywords you choose. Text filtering, URL blocking, and optional on-device AI image classification.

### Description

Orange Filter is a Chrome extension that hides web content based on keywords you choose.

It filters page text in real time, can block matching URLs, and supports an optional on-device image classifier to hide relevant images — without sending anything to external servers.

Privacy first:
• All processing happens locally on your device
• No data collection, no tracking, no external servers
• Your keyword lists and settings are stored only in your browser

Customizable:
• Add or remove keywords at any time
• Adjust sensitivity settings
• Whitelist your favorite sites
• Choose between text-only or text + image filtering modes

How it works:
• Add keywords to your filter list, and TheOrangeFilter will hide matching content from web pages automatically
• Articles, images, headlines, and other page elements containing your keywords are hidden in real-time
• URL-level blocking prevents pages from loading if they match your keywords
• Whitelist sites you trust to bypass filtering entirely

On-device AI image classification (optional):
• Uses TensorFlow.js machine learning models running entirely on your device
• No images are ever sent to external servers — your browsing stays private
• AI can detect and hide relevant images even when text-based filtering misses them

Browse the web on your terms.

### Category

Productivity

### Language

English

---

## Privacy

### Single purpose description

TheOrangeFilter hides web page content — text, images, and URLs — that matches user-defined keywords. All processing happens locally on the user's device.

### Permission justifications

**host_permissions — <all_urls>**

The extension's content script must run on all websites to scan page text and images for user-configured filter keywords. Filtering requires access to every page the user visits so matching content can be hidden in real-time. No page data is collected or transmitted.

**declarativeNetRequest**

Used to block page loads for URLs that match the user's filter rules. This supports the extension's single purpose by preventing unwanted pages from loading.

**activeTab**

Used only when the user clicks the extension button, to apply filtering or open the settings for the currently active tab. The extension does not access other tabs unless the user interacts with it.

**storage**

Stores the user's filter settings locally, including keyword lists, whitelist domains, and feature toggles (such as enabling or disabling image filtering). No data is sent to external servers.

**offscreen**

Used only to run on-device TensorFlow.js image classification in an offscreen document, so image filtering can run without a visible UI. No images or results are uploaded or transmitted.

### Data use disclosures

The extension does not collect, transmit, or sell any user data. All filtering and classification happens locally on the user's device. No analytics, no telemetry, no third-party services.

---

## Notes to reviewer (optional field)

This is a resubmission. The previous version was rejected for requesting the "scripting" permission without using it. That permission has been removed. The content script is injected via the manifest's content_scripts field and does not require the scripting API.
