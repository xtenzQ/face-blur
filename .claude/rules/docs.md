---
paths:
    - "CONTEXT.md"
    - "docs/**"
    - "README.md"
---

- **Critical:** All documentation is written in English.
- `CONTEXT.md` is a glossary only: one or two sentence definitions of project-specific terms, with `_Avoid_` synonyms. No implementation details,
  no specs, no status notes. Use the canonical terms (Photo, Batch, Region, Detection, Mask, Metadata, Export) everywhere, including code
  identifiers and UI strings.
- ADRs live in `docs/adr/NNNN-slug.md` with sequential numbering and an optional `status` frontmatter. Body is 1–3 sentences of context, decision
  and reasoning; add `Considered Options` or `Consequences` only when they carry information a future reader would otherwise lack.
- Write an ADR only when a decision is hard to reverse, would surprise a reader without context, and came out of a real trade-off. Library picks
  that could be swapped in an afternoon do not get an ADR.
- When a decision recorded in an ADR changes, add a new ADR that supersedes it and set `status: superseded by ADR-NNNN` on the old one; never edit
  history.
- README covers: what the app does, privacy guarantee, how to run/build/test, and where the model comes from (licence). Keep it short and current.
