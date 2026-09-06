---
paths:
    - "test/**"
    - "**/*.test.ts"
---

## Framework & layout

- Vitest. Unit tests sit next to the code as `*.test.ts`; integration tests that need the real model, `sharp` or fixtures live in `test/`.
- Test names read as sentences: `it('suppresses a large low-score box around a confirmed face')`. Group with `describe` per function or scenario.
- Only `// given`, `// when`, `// then` comments are allowed in tests; no other comments.
- Assertion style is consistent within a file (`expect` only).

## Fixtures

- **Critical:** Only CC0 / public-domain photos go into `test/fixtures`. Every file is listed in `test/fixtures/FIXTURES.md` with source URL,
  author and licence, and in `expected.json` with the expected face count and pose notes. Never add personal photos or anything with an unclear
  licence.
- Fixture tests assert against `expected.json`; when the detector legitimately improves or regresses, update the expectation in the same change and
  say why in the commit message.
- Keep fixtures under 3 MB each and the long side between 1200 and 4000 px.
- Personal or otherwise unlicensed photos used for manual testing go into `test/fixtures-local/` (gitignored); in dev they are served at
  `/test/fixtures-local/<name>` and can be dropped into the app via a `DragEvent` from the console.

## Test quality

- Every new test must fail against the unchanged code. Mutating a threshold or removing a branch should turn at least one test red.
- Decoder tests build synthetic `YuNetOutputs` with a single hot cell and assert the exact box; do not test decoding through the real model.
- Geometry tests round-trip: `unrotatePoint(rotatePoint(p))` equals `p` for every rotation.
- Model-backed tests (`test/detect.fixtures.test.ts`, EXIF tests using `sharp`) are allowed to be slow; keep them in `test/` and never mock the
  model there.
- Extract repeated setup into small helpers inside the test file; no shared mutable fixtures between tests.
- Tests must run cleanly with `npm test` on a fresh clone (`npm ci`), on macOS and on the Ubuntu CI runner.
