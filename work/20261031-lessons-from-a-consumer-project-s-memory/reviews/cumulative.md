## Review: 20261031-lessons-from-a-consumer-project-s-memory · cumulative

APPROVED, because the record now matches the code (D-001 r2 covers phase 1's placement), and the follow-up fix to `deletesInsideWrapper` denies the three forms that got past it, with no new false positives in my probes.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "The exact instruction text for every item is in ... ## Walkthrough outcomes" | request.md:1 | PASS | src/agents/architect.md:33-37,49,77; src/skills/implementing/SKILL.md:26,32,39-41; checked against the report |
| S-2 | "Nothing from the consumer project goes in: neutral examples only" | request.md:1 | PASS | added examples use orders, the shop and metres |
| S-3 | "guard.block blocked kinds" | request.md:5 | PASS | src/lib/hooks/guard/block/index.mts:15-16,55-58 |
| S-4 | "deferred criteria at close and in lint.schema" | request.md:5 | PASS | src/lib/shared/work/artifact.mts:115-123; src/lib/verbs/close/close.mts:142; src/lib/hooks/lint/schema/index.mts:91 |
| S-5 | "absent greps" | request.md:5 | PASS | src/lib/verbs/verify/index.mts:52-60 |
| S-6 | "guard.scope on Write" | request.md:5 | PASS | src/lib/hooks/guard/scope/index.mts:52-62 |
| S-7 | "guard.bash wrapped deletes" | request.md:5 | PASS | src/lib/hooks/guard/bash/payloads.mts:35-41,168-190; judge.mts:50 |
| S-8 | "check and drive in a nested checkout" | request.md:5 | PASS | src/lib/shared/checkouts.mts:95-100; src/lib/verbs/check/index.mts:46-56; src/lib/verbs/drive/index.mts:59-62 |
| S-9 | "with unit tests" | request.md:5 | PASS | one test file per kernel change, plus the new payloads.test.mts case for group, @ and script block |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: OQ-001: D-001 (r2) and OQ-001 say "the user ruled", but the phase 1 reply reads "the lead rules for the user". Confirm with the user that the premise paragraph belongs once in architect.md Constraints.
Findings: clean
Classes: none
Checked: Probed the staged payloads.mts fix as agent and lead. These are denied: `cmd /c "(del a.txt)"`, `cmd /c @del a.txt`, `pwsh -Command "& { Remove-Item a.txt }"`, `pwsh -c "& { echo a } ; rm b"`, and PowerShell `cmd /c del`. These still get no decision: `pwsh -c "& { Write-Host 'done; del' }"`, `& { Get-ChildItem }`, `echo rm`, `git rm`, `Write-Output rm`, `cmd /c dir`, `cmd //c mklink`, `pwsh -c Get-ChildItem`. `ls (x)` is still allowed. T-1.2 is graded against D-001 (r2), as its RISK-002 directs, because phase 1 is approved. The last mutation, on payloads.mts:174, was killed, and it predates the staged fix.

APPROVED
