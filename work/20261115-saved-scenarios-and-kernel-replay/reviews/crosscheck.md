## Review: 20261115-saved-scenarios-and-kernel-replay · crosscheck

ALIGNED: the amendments fix both Major findings and the two Minor rows they covered, and nothing new appeared.

scope: full. No `delta:` line came with the message. I re-read the revision log, phases 1, 4 and 10, and the places they touch, and checked the structure again. I did not re-read the untouched decisions or phases.

Alignment: PASS
Decisions: HONOURED
Findings: 0 critical, 0 major, 1 minor
- [Minor] work/20261115-saved-scenarios-and-kernel-replay/design.md#D-004: Terminology: `.claude/MEMORY.md` `## Language` still has no entry for saved scenario, card, content key or run key. Add glossary entries or rename one. This is carried over from the first pass.
Classes: none
Checked:
- **T-1.4:** it now uses `{home}`, which D-002's pattern reads as a placeholder, so it can be satisfied.
- **T-1.7:** it uses `picket drive --run "<command>" --env PICKET_ENGINE=...`. `src/lib/verbs/drive/index.mts:149` has `--env NAME=VALUE`, and line 74 logs `picket drive --run <command>`, so the declared command still matches the drive row.
- **Phase 4:** the no-engine `run` row carries the requested mode, and T-4.5 asserts `full` and `affected`.
- **Phase 10:** the `ELSEWHERE` entry is named as `.picket/env/compose.yaml` and the `[INFERRED]` mark is gone.
- **Structure:** there are still 10 phases and 8 decisions, and the revision lines are within 30 words each. The new pre-existing-path claim for `ELSEWHERE` (`test/repo/markdown-paths.test.mjs:16`) holds.

ALIGNED
