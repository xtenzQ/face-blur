# Face Blur

Hide faces in photos before you share them. Runs entirely in your browser: the photo never leaves your device.

- Detects faces automatically, including profiles, tilted heads and small faces in group shots (YuNet, run on four rotations plus tiles for large photos).
- Every detected Region can be toggled, moved, resized or reshaped; draw your own Regions for licence plates, badges or faces the detector missed.
- Pixelate or blur, one strength slider for the whole Batch, live preview, hold Space to peek at the original.
- Load one photo or a Batch (JPEG, PNG, WebP, HEIC), download each result or everything as a zip.
- Keeps EXIF by default (date, camera, GPS) with a thumbnail regenerated from the masked result; tick "Strip metadata" to drop it all.
- Works offline once loaded (PWA).

## Known limits

- Detection is tuned for upright photos. Strongly rolled heads (lying down) are often found only as dashed suggestions; click them to enable, or draw a Region by hand.
- Metadata is carried over for JPEG input only. HEIC is re-encoded to JPEG (Safari decodes HEIC natively; other browsers download a 3 MB decoder on first use).
- Very large photos (over ~16 megapixels) may exceed the canvas limit on iOS Safari. Desktop browsers are fine.

## Privacy

There is no server. Detection uses a neural network executed by ONNX Runtime Web inside the page; the model and WebAssembly are served with the app from the same origin. No analytics, no third-party scripts. See `docs/adr/0001-all-processing-on-device.md`.

## Development

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit tests + model-backed fixture tests (onnxruntime-node, sharp)
npm run build      # typecheck + production build into dist/
```

CLI helpers (Node 24, no build step):

```bash
node scripts/detect-image.ts input.jpg annotated.jpg
node scripts/blur-image.ts input.jpg output.jpg --exclude 2,5 --style pixelate --strength 0.6
```

Deployment: pushes to `main` run tests, build with `BASE_PATH=/<repo>/` and publish `dist/` to GitHub Pages (`.github/workflows/deploy.yml`).

## Project docs

- `CONTEXT.md`: the vocabulary (Photo, Batch, Region, Detection, Mask, Metadata, Export).
- `docs/adr/`: decisions and their reasons.
- `.claude/rules/`: coding conventions per area.

## Model

`public/models/face_detection_yunet_2026may.onnx` is YuNet from the [OpenCV Zoo](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet), MIT licence (see `public/models/YUNET-LICENSE`). Test fixtures are CC0 photographs from Wikimedia Commons, listed in `test/fixtures/FIXTURES.md`.
