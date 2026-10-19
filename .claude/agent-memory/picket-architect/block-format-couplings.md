---
name: block-format-couplings
description: Code that parses agent block lines by position (pr.mjs finding lines, packet.mjs one-word labels, guard.block 40-line budget) and the near-full CLAUDE.md byte budget; check before adding a block field
metadata:
  type: reference
---

Checked 2026-10-18 while designing 20261018-adopt-comparison-report-improvement-ideas:

- `core/lib/pr.mjs` parses reviewer finding lines as `- [Severity] path:line — text` by position, so a tag inserted after the severity breaks posting to a PR. Add new reviewer data as its own block line (`Classes:`), not inside finding lines.
- `parseBlock` in `core/lib/packet.mjs` reads fields with `^([A-Z][a-z]+):`, so a two-word label such as `Root cause:` is not a field until that regex changes.
- `guard.block` counts non-finding lines against a 40-line budget per block.
- CLAUDE.md was 2043 of 2048 bytes; any new name in the `core/templates/claude-block.md` sentence needs a shorter sentence.
- Reviewer row ids repeat across checklist files (`A1` in both framework files, `E1`, and `Sc1` in vertical-slice), so pick a fresh two-letter prefix for new rows.

**How to apply:** grep these parsers before any design adds a block line or row. Related: [[verify-grep-patterns]], [[statusline-contract]].
