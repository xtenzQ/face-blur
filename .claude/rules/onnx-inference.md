---
paths:
    - "src/detect/**/*.ts"
    - "test/support/**/*.ts"
---

## YuNet model facts (do not rediscover)

- Model: `public/models/face_detection_yunet_2026may.onnx` (OpenCV Zoo, MIT). Dynamic input `input` of shape `[1, 3, H, W]`, float32, **BGR**
  planar, values 0–255 (no normalisation, matches `cv::dnn::blobFromImage` defaults). H and W must be multiples of 32 (`INPUT_DIVISOR`); pad with
  zeros bottom/right.
- Outputs: `cls_{8,16,32}` `[1, N, 1]`, `obj_{8,16,32}` `[1, N, 1]`, `bbox_{8,16,32}` `[1, N, 4]`, `kps_{8,16,32}` `[1, N, 10]`, where
  `N = (H/stride) * (W/stride)` and cell index is `row * cols + col`.
- Decoding (matches OpenCV `FaceDetectorYN`): `score = sqrt(clamp01(cls) * clamp01(obj))`, `cx = (col + bbox[0]) * stride`,
  `cy = (row + bbox[1]) * stride`, `w = exp(bbox[2]) * stride`, `h = exp(bbox[3]) * stride`, landmarks `(kps[2n] + col) * stride`.
- The model detects faces of roughly 10–300 px in the input; that is why the pipeline downscales to `maxSide` and adds tiles for very large photos.

## Runtime

- `src/detect/*` is runtime-agnostic: only `browser-runner.ts` imports `onnxruntime-web`, only `test/support/node-runner.ts` imports
  `onnxruntime-node`. The decode, NMS, geometry and pipeline modules take plain typed arrays.
- Import `onnxruntime-web/wasm` (WASM-only build). Set `ort.env.wasm.wasmPaths` to the app-served `.wasm` asset URL and `numThreads = 1`;
  GitHub Pages has no COOP/COEP headers so threads are unavailable anyway.
- Never fetch models or WASM from a CDN (ADR-0001). Model files are static assets under `public/models/`.
- Create the inference session once and reuse it across Photos; session creation is the expensive part.

## Detection pipeline conventions

- Coordinates returned by `detectFaces()` are in original image pixels. Every pass (rotation, tile) records its `PassTransform` and maps results
  back through `toOriginalCoordinates()`; add new pass types the same way.
- Rotated passes (90/180/270) use `rotatedPassThreshold`, higher than `candidateThreshold`, because they produce many false positives on upright
  photos. Do not lower it without re-running the fixture tests.
- Merging uses IoU **and** intersection-over-smaller (containment) so a large low-score box around a confirmed face is suppressed. Keep both.
- Any change to thresholds or pass planning must be verified with `npm test` against `test/fixtures` (real photos through onnxruntime-node).
