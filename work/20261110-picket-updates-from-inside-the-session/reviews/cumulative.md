## Review: 20261110-picket-updates-from-inside-the-session · cumulative

Approved: every request sentence and plan criterion has code and test evidence, and the one gap is that the request says "mismatch" while the code tells only on a newer version. That is a question for the user, not a defect.

Requirements: PASS (6), UNCLEAR (1, S-4)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-4 | "A session-start check compares that version with the running plugin's version and, on a mismatch, tells the user once" | request.md:1 | UNCLEAR | /mnt/work/development/github/picket/src/lib/hooks/inject/state/index.mts:59 tells only when the running version is newer (D-004 rejects telling on any difference) |

Alignment: PASS (19; T-1.6 DEFERRED: QA, release QA pass of the next alpha)
Decisions: HONOURED
Regression: 1 unrequested behaviour change (init now re-serialises an existing .picket/config.json in 2-space JSON)
Sources: none
Questions: S-4 the request says "on a mismatch", but D-004 tells only when the running Picket is newer than the recorded one, so a teammate on an older plugin hears nothing. Confirm that is what you want.
Findings: 1 minor
- [Minor] /mnt/work/development/github/picket/src/lib/verbs/init/init.mjs:87: an existing config is rewritten with `JSON.stringify(…, null, 2)`. A probe shows a one-line `{"version": 1, "security_paths": ["a/", "b/"]}` comes back as 8 lines. Keys, order and EOL are kept as D-003 asks, but the hand formatting is lost, which gives a noisy diff on the first init after an update.

Classes: none
Checked: built the hook and ran it twice in scratch with picket_version 0.0.1 (notice on the first run, nothing on the second, notice file `{"version":"1.0.0-alpha.5"}`); `picket --version` = 1.0.0-alpha.5; 57/57 in the five changed test files pass; SemVer edge cases (alpha.10 > alpha.9, release > prerelease, unparsable running gives no notice); uninstall callers at uninstall.mts:84,133,160 behave as D-002 says; readTemplate already needs pluginRoot, so `picketVersion()` as init's default adds no new failure; mutant index.mts:57 was killed; silenced is empty; no comments added.

APPROVED
