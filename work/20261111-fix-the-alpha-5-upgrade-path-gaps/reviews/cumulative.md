## Review: 20261111-fix-the-alpha-5-upgrade-path-gaps · cumulative

Approved: every request sentence and plan criterion is met in code, tested and driven; the one Major is phase 2's missing red proof, which does not block.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "When the install fails, init runs `claude plugin marketplace update picketai` and tries the install once more; it reports the install as failed only when the retry fails too." | request.md:2 | PASS | src/lib/verbs/init/init.mjs:274-279; tests "a failed first install refreshes…", "a failing install after the refresh names both commands…" |
| S-2 | "init --statusline writes the project status line over an old Picket status line held in another settings file" | request.md:3 | PASS | init.mjs:160-175; T-2.1/T-2.2 tests; the style line in user settings is exempt by the user's OQ-001 ruling |
| S-3 | "init (with or without the flag) warns naming that file and saying to remove the old entry" | request.md:3 | PASS | init.mjs:178-182, :317; install.mts:76-78 |
| S-4 | "uninstall's output names an old Picket status line in the user settings too, since it does not edit user settings" | request.md:3 | PASS | src/lib/verbs/uninstall/index.mts:21-24, :29; render :44 |
| S-5 | "Unit tests for each." | request.md:4 | PASS | install.test.mts, init/index.test.mts, uninstall/index.test.mts, 41/41 pass |
Alignment: PASS (14 PASS; T-1.7 DEFERRED: QA, the release QA pass)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 1 major, 1 minor
- [Major] work/20261111-fix-the-alpha-5-upgrade-path-gaps/phases/2.block.md:11: phase 2 fixes a defect and its `Red:` line is `n/a`; no test was run against base 4a2b7e2. Without a recorded red, nothing shows the new tests catch the bug they are named for. Run the T-2.1 and T-2.2 tests against base and record the failure. (Reading base `statusLineHolder` shows it returns `{ path: <user file>, ours: false }`, so the T-2.1 assertion on `settingsOf(root).statusLine` would fail there.) Likelihood: low. Leave it: phase 2 has no recorded red; by reading base code, its init tests fail there.
- [Minor] src/lib/shared/install.mts:63: the new `statusLineIn` reads `statusLine` from a settings file, which `statusLineOf` in src/lib/verbs/init/init.mjs:144 already does. init now uses both: the holder calls `statusLineOf`, the notes call `holdsPicketStatusLine`. `isOldPicketStatusLine` (install.mts:59) is exported but has no caller outside its module. Keep one reader, used by init.
Classes: Pb1
Checked: drove `init --root <scratch> --no-install --statusline` from source with HOME holding `picket statusline`. It wrote the project value, printed the WARNING naming the user file and left that file byte for byte. Ran `uninstall --dry-run` in process (verb.parse/run/render with edgeContext, same HOME); it printed the note under `Manual steps:` and changed nothing. I could not drive the fake-claude half of T-1.5 because guard.bash denies chmod, so it rests on the recording-runner tests and the developer's drive. Checked the holder edge cases (local old line with a foreign or style user line); they match D-002 (r2). Ran test/cli/init.test.mjs: 18/18 pass. Base tests named in T-1.4 and T-2.4 are unedited. silenced is empty. The mutant at install.mts:56 was killed. The diff adds no comments. The swallowed refresh error at init.mjs:275 is mandated by D-001.

APPROVED
