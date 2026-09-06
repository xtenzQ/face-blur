---
paths:
    - "src/image/**/*.ts"
    - "src/mask/**/*.ts"
    - "src/export/**/*.ts"
    - "src/ui/editor*.ts"
---

## Image loading

- Decode through an `HTMLImageElement` (`img.decode()`) or `createImageBitmap(blob, { imageOrientation: 'from-image' })` so EXIF orientation is
  applied before anything reads the pixels. Regions are meaningless against un-oriented pixels.
- HEIC: try native decoding first (Safari), fall back to the lazily imported `heic-to` module. The fallback is loaded only when the first HEIC
  arrives; it must not be part of the initial bundle.
- Keep the original `File` (for EXIF) and the decoded image separately. Never re-read pixels from the file after decoding.

## Masks

- Pixelate = draw the Region into a small canvas (`imageSmoothingEnabled = true`), then back up with `imageSmoothingEnabled = false`. Block size
  comes from `pixelBlockSize()` in `src/mask/geometry.ts`, never a hardcoded pixel count, so it scales with the face size.
- Blur = progressive downscale→upscale resampling (`resampleBlur` in `src/mask/render.ts`); the number of halving steps comes from `blurRadius()`.
  **Never use `ctx.filter = 'blur()'`**: WebKit/Safari renders canvas filter blur unreliably — it offsets the filtered layer by an amount that
  grows with the radius, so large faces came out doubled/ghosted while small faces looked fine. Resampling is pixel-consistent across engines. Draw
  the source into the tile with a margin around the Region so the blurred edge does not pick up transparent black.
- The Region shape becomes an alpha mask (`applyShapeAlpha`): the shape is dilated outward by the feather radius and then softened with the same
  `resampleBlur`, so the whole Region stays fully covered and the soft edge lies outside the box. Never blur the un-dilated shape: half the fade would eat into the Region and a
  strong mask would look like it covers only the centre. The same `maskPath()` helper is used by the live preview and by Export; they must never
  diverge.
- Mask rendering must be identical in the on-screen preview and in the Export, except for scale. Implement it once against a `CanvasRenderingContext2D`
  and call it from both.

## Export

- Export always renders from the full-resolution source, never from the preview canvas.
- JPEG quality is the `JPEG_QUALITY` constant (0.92). PNG in, PNG out; everything else out as JPEG.
- The EXIF pipeline (`src/export/exif.ts`) must: reset Orientation to 1, drop the original IFD1 thumbnail, and insert a thumbnail rendered from the
  masked result. Metadata is only carried over for JPEG input.
- Downloads use a temporary `<a download>` with an object URL; revoke it after the click.
- Batch zip uses `fflate` with `level: 0` (JPEG/PNG do not compress further).
