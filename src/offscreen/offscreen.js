/**
 * Offscreen Document - The GPU Worker
 * Handles heavy ML inference using TensorFlow.js (MobileNet V1/V2)
 */
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

console.log('Offscreen document loaded');

let model = null;
let labels = [];

const MODEL_PATH = 'assets/models/mobilenet/model.json';
const METADATA_PATH = 'assets/models/mobilenet/metadata.json';
const WASM_DIR = 'assets/wasm/';

async function initializeModel() {
  try {
    console.log('Loading TensorFlow.js model...');

    // Configure WASM backend
    setWasmPaths(chrome.runtime.getURL(WASM_DIR));
    await tf.setBackend('wasm');
    console.log('Using WASM backend');

    // Load Metadata to get labels
    const metadataRes = await fetch(chrome.runtime.getURL(METADATA_PATH));
    const metadata = await metadataRes.json();
    labels = metadata.labels;
    console.log('Model labels:', labels);

    // Load Model
    model = await tf.loadLayersModel(chrome.runtime.getURL(MODEL_PATH));

    // Warmup
    tf.tidy(() => {
      model.predict(tf.zeros([1, 224, 224, 3]));
    });

    console.log('MobileNet model initialized successfully (WASM)');
  } catch (error) {
    console.error('Failed to initialize TensorFlow model:', error);
  }
}

/**
 * Preprocesses the image and runs prediction
 */
async function predict(imageElement) {
  if (!model) return { isBlocked: false, confidence: 0 };

  return tf.tidy(() => {
    // 1. Convert to Tensor
    let tensor = tf.browser.fromPixels(imageElement);

    // 2. Resize to 224x224
    tensor = tf.image.resizeBilinear(tensor, [224, 224]);

    // 3. Normalize to [-1, 1] (Standard Teachable Machine preprocessing)
    // Formula: (pixel / 127.5) - 1
    tensor = tensor.toFloat().div(tf.scalar(127.5)).sub(tf.scalar(1));

    // 4. Expand dims to batch [1, 224, 224, 3]
    tensor = tensor.expandDims(0);

    // 5. Predict
    const predictions = model.predict(tensor);
    const probabilities = predictions.dataSync(); // Float32Array

    // 6. Map to labels
    // Assuming labels are ["trump", "safe"]
    const trumpIndex = labels.indexOf('trump');
    const safeIndex = labels.indexOf('safe');

    if (trumpIndex === -1) {
      console.error('Label "trump" not found in metadata');
      return { isBlocked: false, confidence: 0 };
    }

    const trumpScore = probabilities[trumpIndex];

    // Threshold > 0.85 for high confidence
    const isBlocked = trumpScore > 0.85;

    return {
      isBlocked,
      confidence: trumpScore,
      layer: 'mobilenet',
    };
  });
}

// Initialize immediately
initializeModel();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  handleMessage(message).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message) {
  switch (message.type) {
    case 'PING':
      return { success: true, data: 'PONG' };

    case 'SCAN_IMAGE':
      if (!model) {
        return { success: false, error: 'Model not initialized' };
      }

      try {
        // Load image from base64 or Blob
        const img = new Image();

        if (message.data.type === 'base64') {
          img.src = message.data.data;
        } else {
          // Handle Blob logic if we implement that later
          return { success: false, error: 'Only base64 supported currently' };
        }

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const result = await predict(img);
        return { success: true, ...result };
      } catch (error) {
        console.error('Scan Error:', error);
        return { success: false, error: error.message };
      }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}
