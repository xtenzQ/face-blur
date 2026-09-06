# Face Blur

Browser-only tool that detects faces (including profiles and tilted heads) in photos, lets the user adjust the Regions by hand, masks them and
exports the result. Nothing leaves the device.

- Vocabulary: `CONTEXT.md` (use its terms in code, UI and docs).
- Decisions: `docs/adr/` (read before changing the detector, privacy model, EXIF handling or scope).
- Coding rules: `.claude/rules/` (loaded automatically by path).

## Commands

- `npm run dev` – Vite dev server
- `npm test` – Vitest (unit + model-backed fixture tests, needs `npm ci` first)
- `npm run build` – typecheck + production build into `dist/`
- `node scripts/detect-image.ts <in.jpg> <annotated.jpg>` – run the detector on one photo from the CLI
- `node scripts/blur-image.ts <in.jpg> <out.jpg> [--exclude 1,2] [--style pixelate|blur] [--strength 0..1]` – mask faces from the CLI

## Layout

`src/detect` model decoding + pipeline · `src/domain` Region/Photo rules · `src/image` decoding/HEIC/EXIF read · `src/mask` mask rendering ·
`src/export` encode/EXIF write/zip · `src/ui` DOM, editor, store · `src/i18n` strings · `test/` fixtures and model-backed tests · `scripts/` CLI.
