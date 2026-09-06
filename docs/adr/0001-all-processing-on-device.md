---
status: accepted
---
# All processing happens on the device; pixels never leave it

The application exists to hide faces before a photo is shared, so it must not itself become a leak. Detection (a neural network via ONNX Runtime Web), masking (Canvas) and Export all run inside the browser. The only network traffic is loading the static site and the model weights, which are served from the same origin as the app, never from a third-party CDN. No analytics, no "server-side fallback for slow devices".

## Consequences

- The detector must be a model that runs in the browser (see ADR-0003).
- Large photos take as long as the device takes; the only accelerations are local ones (downscaling for detection, WebGPU later).
