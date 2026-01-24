/**
 * Offscreen Document - The GPU Worker
 * Handles heavy ML inference (MediaPipe, Transformers.js)
 */
import { FilesetResolver, ImageEmbedder } from '@mediapipe/tasks-vision';
import { pipeline, env } from '@huggingface/transformers';

console.log('Offscreen document loaded');

// Configure transformers.js to use local models
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.useBrowserCache = false;
env.localModelPath = chrome.runtime.getURL('assets/models/');
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('assets/wasm/');

let faceEmbedder = null;
let referenceVectors = [];
let classifier = null;

async function initializeModel() {
  try {
    console.log('Initializing MediaPipe FaceEmbedder...');
    const vision = await FilesetResolver.forVisionTasks(
      chrome.runtime.getURL('assets/wasm')
    );

    faceEmbedder = await ImageEmbedder.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: chrome.runtime.getURL(
          'assets/models/face_embedder.task'
        ),
      },
      runningMode: 'IMAGE',
    });

    console.log('Loading reference vectors...');
    const response = await fetch(
      chrome.runtime.getURL('assets/models/trump_vectors.json')
    );
    referenceVectors = await response.json();

    console.log('Initializing SigLIP classifier...');
    classifier = await pipeline(
      'zero-shot-image-classification',
      'siglip-base-patch16-224',
      {
        device: 'webgpu',
      }
    );

    console.log('MediaPipe FaceEmbedder and SigLIP initialized successfully');
  } catch (error) {
    console.error('Failed to initialize models:', error);
  }
}

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA * mB === 0) return 0;
  return dotProduct / (mA * mB);
}

/**
 * Checks if any face in the image matches the Trump reference vectors
 */
async function isTrumpFace(imageBitmap) {
  if (!faceEmbedder || referenceVectors.length === 0)
    return { isBlocked: false, confidence: 0 };

  try {
    const result = faceEmbedder.embed(imageBitmap);
    // ImageEmbedder returns ImageEmbedderResult which has embeddings array
    // Each embedding has floatEmbedding or quantizedEmbedding

    if (!result.embeddings || result.embeddings.length === 0) {
      return { isBlocked: false, confidence: 0 };
    }

    let maxSimilarity = 0;

    for (const embedding of result.embeddings) {
      const vector = embedding.floatEmbedding;
      if (!vector) continue;

      for (const ref of referenceVectors) {
        const similarity = cosineSimilarity(vector, ref.vector);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
    }

    // Threshold from spec.md: > 0.6
    const threshold = 0.6;
    return {
      isBlocked: maxSimilarity > threshold,
      confidence: maxSimilarity,
    };
  } catch (error) {
    console.error('Error in isTrumpFace:', error);
    return { isBlocked: false, confidence: 0, error: error.message };
  }
}

/**
 * Scans image for concepts using SigLIP
 */
async function scanContext(imageBitmap) {
  if (!classifier) return { isBlocked: false, confidence: 0 };

  try {
    // SigLIP can take ImageBitmap directly in Transformers.js v3
    const labels = ['Donald Trump', 'MAGA Rally', 'Politics'];
    const result = await classifier(imageBitmap, labels);

    // Result is an array of { label: string, score: number }
    // We check if any of the target labels have a high score
    const trumpScore =
      result.find((r) => r.label === 'Donald Trump')?.score || 0;
    const magaScore = result.find((r) => r.label === 'MAGA Rally')?.score || 0;

    const maxScore = Math.max(trumpScore, magaScore);
    const threshold = 0.5; // Adjusted for SigLIP confidence

    return {
      isBlocked: maxScore > threshold,
      confidence: maxScore,
      labels: result,
    };
  } catch (error) {
    console.error('Error in scanContext:', error);
    return { isBlocked: false, confidence: 0, error: error.message };
  }
}

// Initialize immediately
// initializeModel();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  handleMessage(message).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message) {
  // console.log('Offscreen received message:', message.type);

  switch (message.type) {
    case 'PING':
      return { success: true, data: 'PONG' };

    case 'SCAN_IMAGE':
      return { success: false, error: 'AI Disabled' };
    /*
      if (!faceEmbedder) {
        return { success: false, error: 'Model not initialized' };
      }
      
      try {
        let imageBitmap;
        if (message.data.type === 'blob') {
          // data.data is a Blob or ArrayBuffer
          const blob = new Blob([message.data.data], { type: message.data.mimeType });
          imageBitmap = await createImageBitmap(blob);
        } else if (message.data.type === 'base64') {
          const res = await fetch(message.data.data);
          const blob = await res.blob();
          imageBitmap = await createImageBitmap(blob);
        } else {
          return { success: false, error: 'Unsupported payload type' };
        }

        const faceResult = await isTrumpFace(imageBitmap);
        if (faceResult.isBlocked) {
          return { success: true, ...faceResult, layer: 'face' };
        }

        // Layer B: Concept (only if strictMode is requested and face didn't match)
        if (message.data.strictMode) {
          const conceptResult = await scanContext(imageBitmap);
          return { success: true, ...conceptResult, layer: 'concept' };
        }

        return { success: true, ...faceResult, layer: 'face' };
      } catch (error) {
        return { success: false, error: error.message };
      }
      */

    default:
      return { success: false, error: 'Unknown message type' };
  }
}
