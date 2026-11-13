Implement TF-001 of SDR 00004 (artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, D-002; detail in artifacts/strategy/drafts/testing-and-test-environment.md, section 1): declared checks.

Today `picket verify` passes the drive must_have when any drive-class row exists for the phase: it reads no status and counts rows with no work item or phase (driveResult in src/lib/verbs/verify/index.mts). Change it so the architect declares checks in a phase's `drive:` frontmatter and verify checks them:

- A declared check asserts method, path, expected status and an optional `contains` list of literal strings, and names the criterion it covers (`covers`). A CLI or worker phase declares a run: command, exit code, `contains`. `drive: true` stays valid for old records.
- `picket drive` logs what verify needs to check `contains` (the drive log stores status today, not the body or a contains result).
- verify compares the logged responses with the declared checks, for this work item and phase only.
- A mismatch is shown at the phase gate for the user's ruling, as declared versus ran; it is not sent to the architect as drift on its own.
- Under a run grant, a path prefix difference is carried (the path that ran ends with the declared path; method, status and contains hold); a failed status or contains, a different resource, or any difference in a run command stops the run at that phase. A security phase keeps its own gate.
- Carried mismatches appear once, as a group, in the packet at the end of the run; the normal approval accepts them and the kernel writes the correction into the record with a revision log line, with no architect turn.
- The order and design templates, the schema lint and the architect and developer contracts describe the new shape.

Out of scope: the test environment, saved scenarios, keeping an approved check as a scenario, the tester.

## Brief
purpose: Make the drive must_have a real check: the architect declares a request or run with its expected result, and picket verify compares the logged response with it, so a phase gate can no longer pass on an unrelated request
in scope: The declared check shape in a phase's drive frontmatter (method, path, status, contains, covers; a run with command, exit code, contains; drive: true stays valid); what picket drive logs so contains can be checked; verify comparing logged responses for this item and phase only; mismatch shown at the phase gate as declared versus ran; the run grant rule (a path prefix difference is carried, anything else stops the run); the grouped display of carried mismatches and the kernel writing the correction with a revision log line; the order and design templates, the schema lint, the architect and developer contracts
out of scope: The test environment and picket env; saved scenarios; keeping an approved check as a scenario; the tester; the browser adapter; any other part of SDR 00004
