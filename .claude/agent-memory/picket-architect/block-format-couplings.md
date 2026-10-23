---
name: block-format-couplings
description: Code that parses agent block lines by position (pullrequest threads.mts finding lines, packet.mjs one-word labels, guard.block 40-line budget) and the near-full CLAUDE.md byte budget; check before adding a block field
metadata:
  type: reference
---

Checked 2026-10-18 while designing 20261018-adopt-comparison-report-improvement-ideas:

- `FINDING` in `src/lib/verbs/pullrequest/threads.mts` parses reviewer finding lines as `- [Severity] path:line: text` (or with a spaced dash before the text) by position, so a tag inserted after the severity breaks posting to a PR. Add new reviewer data as its own block line (`Classes:`), not inside finding lines.
- `parseBlock` in `src/lib/shared/work/block.mts` reads field labels with `FIELD_LABEL` (`Root cause` or one capitalised word), so any other two-word label is not a field until `FIELD_LABEL` changes.
- `guard.block` counts non-finding lines against a 40-line budget per block.
- CLAUDE.md was 2046 of 2048 bytes on 2026-10-24; any new name in the `src/templates/claude-block.md` sentence needs a shorter sentence.
- Reviewer row ids repeat across checklist files (`A1` in both framework files, `E1`, and `Sc1` in vertical-slice), so pick a fresh two-letter prefix for new rows.

**How to apply:** grep these parsers before any design adds a block line or row. Related: [[verify-grep-patterns]], [[statusline-contract]].
