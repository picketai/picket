## Review: 20261108-session-switch-project-status-line · cumulative

Approved: T-2.7 now reads "prints at least one non-empty line", which the 3-row output meets, and the change's 31 files are byte-identical to b585d2c.

Requirements: PASS (11)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Add a `mods.session` switch to .picket/config.json, like `mods.markdown`." | request.md:2 | PASS | src/lib/shared/mod-switch.mts:1; src/lib/shared/config.schema.json:93 |
| S-2 | "no `/picket-session` command" | request.md:2 | PASS | src/mods/status/hooks/index.tsx:101,105; index.test.tsx:938 |
| S-3 | "no `☰ <n>` band button" | request.md:2 | PASS | src/mods/status/hooks/band.ts:76; pane-actions.ts:130 |
| S-4 | "no session scanning" | request.md:2 | PASS | pane-actions.ts:111-112,124; index.test.tsx:938 |
| S-5 | "The band and its agents line stay." | request.md:2 | PASS | index.test.tsx:951 |
| S-6 | "Absent or true keeps the pane." | request.md:2 | PASS | mod-switch.mts:9; index.test.tsx:971 |
| S-7 | "Document it next to the markdown switch (docs/how-to.md, docs/reference/mods.md, CHANGELOG alpha.6)." | request.md:2 | PASS | docs/how-to.md "### The work pane"; docs/reference/mods.md; CHANGELOG.md:18 |
| S-8 | "the SessionStart hook copies the self-contained statusline.mjs to `.picket/state/statusline.mjs` (git-ignored)" | request.md:3 | PASS | src/lib/hooks/emit/statusline/index.mts:26-36 |
| S-9 | "`init --statusline` writes a statusLine command that runs that copy" | request.md:3 | PASS | src/lib/shared/install.mts:25 |
| S-10 | "First verify on Claude Code 2.1.319 how the status line command is started…" | request.md:3 | PASS | order.md D-004; binary holds `executeStatusLineCommand` and `CLAUDE_PROJECT_DIR:wt(lo()??Bo(je).projectRoot)`; live check T-2.8 deferred |
| S-11 | "`init` and `uninstall` keep recognising the current data folder value and the legacy `picket statusline` value as Picket's." | request.md:3 | PASS | install.mts:42-46; init.mjs:102-105; uninstall.test.mts T-2.5 |

Alignment: PASS (14 PASS, 1 DEFERRED: T-2.8, QA, at the alpha.6 release QA pass)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: order.md:219 holds the new T-2.7 text, and order.md:228 logs it within 30 words; `git diff b585d2c HEAD` over the summary's changed_files is empty (the later admit commits touch none of them); mutation killed, nothing silenced; T-1.7 rests on the lead's main session rerun ("✔ Validation passed").

APPROVED
