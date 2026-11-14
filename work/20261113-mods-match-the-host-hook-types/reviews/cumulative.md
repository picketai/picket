## Review: 20261113-mods-match-the-host-hook-types · cumulative

The change is approved. Every request sentence and every acceptance criterion (T-1.1 to T-2.5) has code and test evidence, and the only finding is one Minor gap in a test.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Fix the `mods` step of `npm test`, which fails with 27 TypeScript errors" | request.md:1 | PASS | Phase 2's recorded `node scripts/test.mjs build mods` run exited 0. No casts remain in the four phase files. |
| S-2 | "Bring the two shipped call sites (`src/mods/index.tsx:38`, `src/mods/markdown/hooks/index.tsx:75`) ... up to the current types" | request.md:1 | PASS | src/mods/markdown/hooks/index.tsx:17 makes `role` optional; :26 and :79 add and call `filePaths` |
| S-3 | "and the three test files up to the current types" | request.md:1 | PASS | markdown/hooks/index.test.tsx:54, :61, :85; picket-markdown.test.tsx:378, :401; status/hooks/index.test.tsx:11, :40, :433 |
| S-4 | "add a check in the repository so the next host change is caught as a named failure" | request.md:1 | PASS | scripts/test.mjs:42, :56; scripts/mods-report.mjs:20, :24; test/repo/mods-report.test.mjs (4 of 4 pass, run here) |
| S-5 | "Separately decide whether `picket mutate` should take its baseline from `npm test`" | request.md:1 | PASS | order.md D-004; no diff under src/lib |
Alignment: PASS (11)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 1 minor
- [Minor] test/repo/mods-report.test.mjs:53: the T-1.5 test checks only `manifest.file` and `contents[].file`. It skips `advice[].file` (`/repo/dist/README.md`) and `directory.findings[].file` (the relative path `.claude-plugin/plugin.json`). So "every `file` value" is met in intent but not literally, and a machine path added under `advice` would still pass the test. Fix: check every `file` key in the report and accept relative paths.
Classes: none
Checked: the mutation test killed its mutant (scripts/mods-report.mjs:16, `===` to `!==`). `silenced` is empty, and `lint.craft` is clean over 885a3d2f..HEAD. The fixture contains no /mnt or /home path and no user name. `git diff --name-only 885a3d2f HEAD -- src/mods` lists exactly the four phase files, and status/hooks/index.tsx is untouched. The survey test still fails if picket draws a Text under a survey, because status/hooks/index.test.tsx:11 passes `AbovePrompt` on to `next`. The plan requires both behaviour changes: the step now always exits 1 on failure instead of passing on the validator's own exit code, and `filePaths` drops hrefs that are not `file:`. CI's mods job runs the same step at .github/workflows/release.yml:186.

APPROVED
