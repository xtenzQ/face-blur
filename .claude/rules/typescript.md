---
paths:
    - "src/**/*.ts"
    - "scripts/**/*.ts"
---

When rules conflict, **Critical** rules take precedence.

## Code quality

- **Critical:** Do not add comments to production code. Write self-documenting code with clear naming instead. No JSDoc, inline comments or TODO
  comments unless explicitly asked.
- **Critical:** `strict` TypeScript with `noUncheckedIndexedAccess` is on. Never use `any`, non-null assertions (`!`) or `as` casts to silence the
  compiler; narrow with a check or restructure the code.
- Extract hardcoded literals (thresholds, sizes, ratios, key names) into named `const` values at the top of the module. Check for an existing
  constant first (`DEFAULT_DETECT_OPTIONS`, `DETECTION_PADDING`, `CONFIRMED_THRESHOLD`, `INPUT_DIVISOR`).
- Prefer pure functions that take and return plain data (`Box`, `Detection`, `Region`). Side effects (DOM, Canvas, fetch, storage) live only in
  `src/ui/`, `src/image/` and `src/export/`.
- Use named exports only. No default exports, no barrel `index.ts` files.
- Relative imports must include the `.ts` extension (`import { x } from './y.ts'`) so scripts run directly under Node without a build step.
- Only erasable TypeScript syntax (`erasableSyntaxOnly`): no `enum`, no `namespace`, no parameter properties. Use string literal unions and
  `as const` objects instead.
- Use `type` imports (`import type { … }`) for anything used only as a type (`verbatimModuleSyntax`).
- Break functions longer than ~30 lines into smaller focused functions with descriptive names. Simplify nested conditions with early returns.
- Descriptive names, no abbreviations except the geometry fields `x`, `y`, `w`, `h`. Booleans use `is/has/can/should` prefixes.
- Functions with more than 4 parameters take an options object with a named interface.
- Do not add runtime null checks for values the types already guarantee.

## Architecture

- Layers: `src/detect` (model decoding and detection pipeline, runtime-agnostic) → `src/domain` (Region, Photo, settings, pure rules) →
  `src/mask` / `src/image` / `src/export` (Canvas, decoding, encoding) → `src/ui` (DOM, events, rendering). Lower layers never import from higher
  ones; `src/detect` and `src/domain` must not reference `document`, `window`, `Canvas` or `File`.
- Every Region and Detection is stored in **original image pixel coordinates** after EXIF orientation is applied. Convert to screen coordinates only
  inside the editor renderer, never store screen coordinates.
- Model inference goes through the `ModelRunner` interface and pixels through `RasterProvider`, so the same pipeline runs in the browser
  (onnxruntime-web + Canvas) and in Node tests (onnxruntime-node + sharp). Do not import `onnxruntime-web` outside `src/detect/browser-runner.ts`.
- All user-visible strings live in `src/i18n/en.ts` and are read through `t()`. Never inline UI text.
- Application state lives in the store in `src/ui/store.ts`; UI modules subscribe to it and render, they do not keep their own copies of Regions.

## Privacy (ADR-0001)

- **Critical:** Never send image data anywhere: no `fetch`/`XMLHttpRequest`/`sendBeacon` with pixels or metadata, no third-party scripts, no
  analytics. Model weights and WASM are served from the app's own origin.
- Never draw unmasked pixels into an Export canvas or thumbnail. The exported thumbnail is generated from the masked result (ADR-0004).
- Revoke object URLs (`URL.revokeObjectURL`) and close `ImageBitmap`s when a Photo is removed.

## Performance

- Run detection on a downscaled copy (long side ≤ 1920) and tiles, never on the full-resolution bitmap.
- Create OffscreenCanvas/canvas contexts once per Photo and reuse them; pass `{ willReadFrequently: true }` when calling `getImageData`.
- Batch work must yield to the event loop between Photos so the UI stays responsive; never block the main thread for more than one Photo.
