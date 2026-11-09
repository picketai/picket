## Review: 20261109-close-guard-test-admit-ledger-gaps · checkpoint

APPROVED: both Majors from the first checkpoint are fixed in the staged changes, and the D-002 and D-004 amendments are in the record.

Alignment: PASS (T-1.x to T-4.x)
Decisions: HONOURED (D-002 (r2) and D-004 (r2) match the code)
Findings: 0 critical, 0 major, 2 minor
- [Minor] work/20261109-close-guard-test-admit-ledger-gaps/design.md:197: the Phase 2 Changes text still describes the r1 mechanism: rename `target` to `<staging>-old`, then rename `staging` to `target`. D-002 (r2) and `swapInto` now move files one by one. Update the Changes wording; T-2.1 and T-2.2 still hold.
- [Minor] work/20261109-close-guard-test-admit-ledger-gaps/design.md#D-004: the code now blanks a quoted span only if it has whitespace and no `SECURITY` word, so `Fix "the login password check" in the form.` keeps `security` true. D-004 (r2) still reads "every quoted span that holds whitespace". Add that exception to D-004.

Classes: none
Checked:
- Signals probe: "Rename the verdict token constant, and store the token in a cookie after login.", "Log the verdict token. Then store the token in the cookie for login.", `` `password reset` `` and "the login password check" all give `security` true. The T-4.1 sentence gives false. The two `Store the token in a cookie after login.` and `Rotate the token for the api.` cases stay true.
- Guard forms: `in-place.test.mts` now pins `--eval=…`, `-pe` and `-Bc` forms. I read this in the tests and did not re-probe `dist`, which may predate the fix.
- Tests: 82 of 82 pass over the admission and guard bash tests.

APPROVED
