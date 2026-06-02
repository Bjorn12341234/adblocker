/**
 * Sprint 2.1 — Direct model eval harness.
 *
 * Loads the shipped Teachable Machine model (src/assets/models/tm-model/)
 * directly in Node and runs it against local images, replicating the EXACT
 * preprocessing used by the extension's offscreen document
 * (src/offscreen/offscreen.js):
 *
 *     fromPixels -> resizeBilinear(224) -> toFloat -> div(127.5) -> sub(1)
 *
 * Prints the full probability vector per image and the `Orange` (= Trump)
 * confidence, plus whether it clears the strict threshold (0.65).
 *
 * This answers the Sprint 2 fork: does the model LOAD-but-MISS (2.2) or
 * ERROR (2.3)?  No browser / extension required.
 *
 * Usage:  node scripts/eval_model.js [image1.jpg image2.jpg ...]
 *   With no args it evaluates the bundled tests/assets/*.jpg fixtures.
 *   Only baseline JPEGs are supported (pure-JS decoder; no webp/png).
 */

const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');

const tf = require('@tensorflow/tfjs-core');
require('@tensorflow/tfjs-backend-cpu');
const { loadLayersModel } = require('@tensorflow/tfjs-layers');

const MODEL_DIR = path.resolve(__dirname, '../src/assets/models/tm-model');
const STRICT_THRESHOLD = 0.65; // matches offscreen.js sensitivity === 'strict'

// A filesystem IOHandler so we can load the layers model without tfjs-node.
function fileSystemHandler(modelDir) {
  return {
    load: async () => {
      const modelJSON = JSON.parse(
        fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8')
      );
      const manifest = modelJSON.weightsManifest[0];
      const weightBuffer = fs.readFileSync(
        path.join(modelDir, manifest.paths[0])
      );
      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs: manifest.weights,
        weightData: weightBuffer.buffer.slice(
          weightBuffer.byteOffset,
          weightBuffer.byteOffset + weightBuffer.byteLength
        ),
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
      };
    },
  };
}

// Decode a baseline JPEG into a [h, w, 3] int tensor (alpha dropped), exactly
// as tf.browser.fromPixels would produce from an <img>.
function jpegToTensor(filePath) {
  const raw = jpeg.decode(fs.readFileSync(filePath), { useTArray: true });
  const { width, height, data } = raw; // data is RGBA
  const rgb = new Int32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = data[i * 4];
    rgb[i * 3 + 1] = data[i * 4 + 1];
    rgb[i * 3 + 2] = data[i * 4 + 2];
  }
  return tf.tensor3d(rgb, [height, width, 3]);
}

async function main() {
  await tf.setBackend('cpu');
  await tf.ready();
  console.log(`Backend: ${tf.getBackend()}`);

  const metadata = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, 'metadata.json'), 'utf8')
  );
  const labels = metadata.labels;
  console.log(`Labels: ${JSON.stringify(labels)}`);
  console.log(`Image size: ${metadata.imageSize}`);

  let model;
  try {
    model = await loadLayersModel(fileSystemHandler(MODEL_DIR));
    console.log('Model loaded OK.\n');
  } catch (e) {
    console.error('MODEL FAILED TO LOAD (points to Sprint 2.3):', e);
    process.exit(1);
  }

  const orangeIndex = labels.indexOf('Orange');

  const args = process.argv.slice(2);
  const images = args.length
    ? args
    : [
        'tests/assets/orange_small.jpg',
        'tests/assets/orange_new.jpg',
        'tests/assets/safe.jpg',
        'tests/assets/safe_new.jpg',
      ].map((p) => path.resolve(__dirname, '..', p));

  for (const imgPath of images) {
    const name = path.basename(imgPath);
    if (!fs.existsSync(imgPath)) {
      console.log(`${name.padEnd(20)}  (missing, skipped)`);
      continue;
    }
    try {
      const probs = tf.tidy(() => {
        // Functional ops (tfjs-core standalone doesn't register tensor-method
        // chaining). Same math as offscreen.js: resize -> /127.5 - 1 -> batch.
        let t = jpegToTensor(imgPath);
        t = tf.image.resizeBilinear(t, [224, 224]);
        t = tf.cast(t, 'float32');
        t = tf.sub(tf.div(t, 127.5), 1);
        t = tf.expandDims(t, 0);
        return model.predict(t).dataSync();
      });

      const orange = probs[orangeIndex];
      const blocked = orange > STRICT_THRESHOLD ? 'BLOCK' : 'pass ';
      const breakdown = labels
        .map((l, i) => `${l}=${probs[i].toFixed(3)}`)
        .join('  ');
      console.log(
        `${name.padEnd(20)}  Orange=${orange.toFixed(3)}  [${blocked}]  | ${breakdown}`
      );
    } catch (e) {
      console.log(`${name.padEnd(20)}  decode/predict error: ${e.message}`);
    }
  }
}

main();
