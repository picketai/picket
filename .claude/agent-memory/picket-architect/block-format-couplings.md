---
name: block-format-couplings
description: Code that parses agent block lines by position (pullrequest threads.mts finding lines, packet.mjs one-word labels, guard.block 40-line budget), every reader of phase block labels, yaml-lite rejecting folded frontmatter, and the near-full CLAUDE.md byte budget; check before adding a block field
metadata:
  type: reference
---

Checked 2026-10-18 while designing 20261018-adopt-comparison-report-improvement-ideas:

- `FINDING` in `src/lib/verbs/pullrequest/threads.mts` parses reviewer finding lines as `- [Severity] path:line: text` (or with a spaced dash before the text) by position, so a tag inserted after the severity breaks posting to a PR. Add new reviewer data as its own block line (`Classes:`), not inside finding lines.
- `parseBlock` in `src/lib/shared/work/block.mts` reads field labels with `FIELD_LABEL` (`Root cause` or one capitalised word), so any other two-word label is not a field until `FIELD_LABEL` changes.
- `guard.block` counts non-finding lines against a 40-line budget per block.
- CLAUDE.md was 2046 of 2048 bytes on 2026-10-24, then grew to 2352 under a 2560 test budget; item 20261109-fix-budget-schema-session-admit-findings plans the block at about 1600 bytes and the budget back at 2048. The test reads the raw size, so a CRLF checkout adds one byte per line (25 lines): keep LF size plus line count within the budget. Any new name in `src/templates/claude-block.md` needs a shorter sentence.
- `claudeBlockSpan` in `src/lib/shared/install.mts` ends the block at the first heading the new template does not own, so dropping or renaming a template `##` heading strands that old section in every upgraded project's CLAUDE.md.
- Reviewer row ids repeat across checklist files (`A1` in both framework files, `E1`, and `Sc1` in vertical-slice), so pick a fresh two-letter prefix for new rows.

- Checked 2026-10-29: phase block labels are read in three places: `src/lib/hooks/guard/block/index.mts` (Files, Red, Root cause), the route service's commit module with `src/lib/shared/work/block.mts` (Commit, Files), and `src/lib/verbs/packet/packet.mjs` (Tests, Lint, Verified, Red, Root cause, Files, Decisions, Comments, Waivers). No kernel code reads the lead's `## Expedited:` block fields.
- `frontmatter()` in `src/lib/util/yaml-lite.mts` throws on a folded `description: >`, which every agent shell and SKILL.md uses; test code reads frontmatter by key lines, as `test/support/routing.mts` does.

**How to apply:** grep these parsers before any design adds a block line or row. Related: [[verify-grep-patterns]], [[statusline-contract]].
