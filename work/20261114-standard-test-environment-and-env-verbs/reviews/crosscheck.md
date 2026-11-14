## Review: 20261114-standard-test-environment-and-env-verbs · crosscheck

The D-007 amendment fixes my Major row on the purge list, so the delta passes. Two Majors from the earlier full pass are outside this delta and are still unaddressed.

Scope: delta (D-007), covering the D-007 section, the revision log and phase 8.

Alignment: N/A (cross-check)
Decisions: HONOURED
Findings: 0 critical, 0 major, 1 minor
- [Minor] work/20261114-standard-test-environment-and-env-verbs/design.md#phase-8: Reference consistency: Changes says the caller prints "the returned list and its path" (`design.md:517`), but `purgeStack` is typed to return `Resources`, which has no path field. Name the return shape, or have the caller derive the path.

Classes: none
Checked: Revision log line, marker `(r2)` and decision body agree (`design.md:227-228`, `design.md:571`). D-007 now orders the evidence file before the first removal call, and the refusal on a failed write is stated in D-007 and phase 8 (`design.md:517`). T-8.6 (`design.md:525`) tests both the file existing when `down` runs and the refusal with no `down` or `image rm` call. The `**Irreversible:**` note (`design.md:526`) matches D-007. The wording is consistent with D-007's "prints only after its run returns".

Outside this delta: the earlier phase 9 reverse-coverage Major (no `D-###` implements it) and the phase 6 E10 versus T-2.5/T-4.7 Major (`design.md:338`, `design.md:415`, `design.md:467`) are unchanged by this amendment. Two earlier Minors also remain: the glossary entries and the outside-host `mock` default. They need their own amendment before Phase 1 can be called clean.

I also sent this block to the lead with `SendMessage`.

ALIGNED
