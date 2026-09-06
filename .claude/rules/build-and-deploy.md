---
paths:
    - "vite.config.ts"
    - "index.html"
    - "public/**"
    - ".github/**"
    - "package.json"
---

- Vite + vanilla TypeScript, no framework. Do not add React/Vue/Svelte or a state library; the UI is one editor view and a gallery strip.
- `base` comes from the `BASE_PATH` env var (`/face-blur/` on GitHub Pages, `/` locally). Every asset URL must go through Vite (`?url` imports or
  `import.meta.env.BASE_URL`), never a hardcoded absolute path.
- The onnxruntime WASM binary is imported with `?url` so Vite fingerprints and serves it from our origin; keep it out of `public/` to avoid a
  second copy.
- PWA (`vite-plugin-pwa`, `registerType: 'autoUpdate'`) precaches the app shell, the model and the WASM. Keep `maximumFileSizeToCacheInBytes`
  large enough for the WASM and never add `runtimeCaching` for external origins.
- No external origins at all: no CDN scripts, no web fonts, no analytics. A CSP `connect-src 'self'` in `index.html` is the guard.
- `npm run build` runs `tsc --noEmit` first; a type error fails the build. CI runs `npm ci`, `npm test`, `npm run build`, then deploys `dist/`
  to GitHub Pages with the official `actions/deploy-pages` flow.
- Model files under `public/models/` are committed binaries with their licence file next to them. Replace a model only together with an ADR.
