---
status: accepted
---
# Face detector: YuNet via onnxruntime-web

We need a detector that runs in the browser (ADR-0001), handles profile and tilted faces, and does not restrict how the app can be published. We chose YuNet from the OpenCV Zoo (MIT for both code and weights, 233 KB, 5 facial landmarks), run through onnxruntime-web; output decoding and non-maximum suppression are our own JavaScript. To catch sideways or upside-down heads the detector runs on four rotations of the photo (0/90/180/270°) and the results are merged with NMS; rotated passes use a higher score threshold because they produce more false positives. Small faces in very large photos are caught by a second pass over 2×2 overlapping tiles when the long side exceeds 3000 px.

## Considered Options

- **SCRFD-2.5G (insightface)**: more accurate on hard faces (WIDER FACE Hard 77 vs 75) but the weights are licensed for non-commercial use only. Rejected for licence cleanliness.
- **YOLO-face**: most accurate (Hard 85) but trained with Ultralytics (AGPL-3.0); ONNX export does not sever the licence. Rejected.
- **MediaPipe BlazeFace**: easiest integration but frontal bias and a 12 MB WASM. Possible as a second detector later.
- **opencv.js with FaceDetectorYN**: the same model without writing the decoder, but +11 MB. Rejected for size.

## Consequences

- Lower accuracy on profiles than SCRFD; compensated with rotations, tiles and manual Regions.
- GitHub Pages does not send COOP/COEP headers, so WASM runs single-threaded. Acceptable for a 233 KB model.
- WebGPU is deferred: the WebGPU build of onnxruntime-web doubles the WASM payload (28 MB vs 14 MB) and the model is fast enough on WASM.
