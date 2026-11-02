## Review: 20261102-session-list-merges-into-picket-status-design · phase 3

Phases 1 to 3 are approved: every criterion is met, and the two Minor findings below do not block.

Alignment: PASS (T-1.1 to T-1.7, T-2.1 to T-2.5, T-3.1 to T-3.6; T-2.6 is DEFERRED to QA by the plan)
Decisions: HONOURED (D-001, D-002, D-003, D-006, D-007). The two deviations are in the developer blocks:
- `src/lib/shared/host-sessions.mts` also imports `paths.mts`, because the repo's paths test lets only that file spell the host folder.
- The stub's types file declares an empty `PluginState` interface, because the validator rejects `export {}`.

Findings: 0 critical, 0 major, 2 minor
- [Minor] src/mods/session/hooks/index.tsx:8: the `session.start` handler is `async` and has no `await` (A3). Drop `async` and return `next(e)`.
- [Minor] src/lib/verbs/list/index.test.mts:63: no list test covers a live session making a non-user item `working`; only `attentionOf` is tested with `isLive`. The `session !== null && live.has(session)` wiring at `src/lib/verbs/list/index.mts:35` is unpinned. The worktree test also asserts only `worktrees`, not the other fields.

Checked:
- **Tests and build:** `npm test` exits 0 (unit, build, product, timing and mods suites).
- **Live run:** after the build, `picket list` prints `"attention":"closed"` and session `43b73270-9af6-4c2f-be1b-deb7965a4c6c` for the T-1.6 item. This reads the already-built `dist`, not a fresh build.
- **Unwaived deletions:** the three deleted tests in `silenced` (`data`, `messages`, `sprite`) belong to code that T-3.2 and the design delete, so there is no Sl1 finding.
- **Leftover references:** none to `ROLE_TONES`, `archived-sessions` or `/md` outside the CHANGELOG line that announces the rename.
- **Lone caller:** `reopen` is called only from `src/mods/markdown/hooks/index.tsx:47`.
- **Test isolation:** the list test runs against a temporary home, not the real session registry.

APPROVED
