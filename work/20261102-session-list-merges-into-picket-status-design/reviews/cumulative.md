## Review: 20261102-session-list-merges-into-picket-status-design · cumulative

Approved: TF-001 to TF-005 are all in the code with tests, and the only findings are two Minor ones.

Requirements: PASS (13)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-5 | "Cleanup lists closed items whose worktree is still on disk (copies `git worktree remove <path>`)" | request.md:3 | PASS | src/mods/status/hooks/work-pane.ts:52-60 copies `git -C <repo> worktree remove <rel>` (OQ-003); test T-5.6 |
Rows S-1 to S-4 and S-6 to S-13 pass. Evidence for each:
- Pane and command: index.tsx:92-102
- Groups: work-pane.ts:8-31
- Tabs, Peek and row actions: pane.tsx:49-98, 188-264
- Never opens, resumes or creates a session: pane-actions.ts has no resume or prompt.fill, and the current session renames through `/rename` only (session-files.ts:132)
- Done list in the mod's store: pane-actions.ts:164-168
- Band pieces: band.ts:75-93
- Band draws with no work item: index.tsx:150, plus T-6.3
- Cheap refresh: pane-actions.ts:79-93, index.tsx:93-95, plus T-6.4 and T-6.6
- Kernel classification and typed rows: attention.mts:8-19, views.mts:49-65, list/index.mts:24-48
- Latest session and greyed rows: work-pane.ts:27-31
- /picket-markdown: markdown index.tsx:11-48, actions.ts:68-72
- Stub, CHANGELOG and deletions: session/hooks/index.tsx, CHANGELOG.md:10, `git ls-files src/mods/session` lists 3 files
Alignment: PASS (T-1.1 to T-6.7; T-2.6, T-4.8 and T-6.8 are DEFERRED by the plan to QA or the product owner)
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-5: the request names `git worktree remove <path>`, and the pane copies the `git -C <repo>` form under OQ-003. The product owner should confirm it.
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/mods/status/hooks/pane-actions.ts:87-90: `watch.signature` is stored before `picket list` runs. A failed or non-array answer leaves the rows stale until another watched mtime changes, because the next tick sees the same signature. Set the signature only after a list lands.
- [Minor] src/mods/status/hooks/pane-actions.ts:204-205: D-008 says Delete all "names the skipped ones". The toast gives a count, and it calls a non-UUID id "open or current". T-5.5 accepts the count.
Classes: none
Checked:
- Delete guard: `isDeletable` (session-files.ts:11) keeps every guard of the base `deleteSession` (current, live, UUID). It covers single delete, Delete all and Cleanup.
- Removed exports: `ListRow` has no consumer left, and `reopen` has one caller.
- Kernel rows: `picket list` here gives 152 rows with attention and session.
- Comments and test kinds: lint.craft is clean over b337dc7..HEAD.
- Mutation: killed.
- Deleted tests: the three in `silenced` (data, messages, sprite) belong to code that T-3.2 deletes, so there is no Sl1 finding.
- `picket verify` for phase 1 returned ok. Phases 2 to 6 run `npm test` and were still running in the background when this review was sent.

APPROVED
