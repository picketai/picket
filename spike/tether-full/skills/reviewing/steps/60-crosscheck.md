# Cross-check: decisions versus phases in one design record

Read-only artifact-consistency pass before Phase 1, and again after an amendment when the architect asks. It answers one question: do the record's `## Decisions` and its `## Phases` agree with each other and with the sources they cite? Code is not read; the per-phase alignment check owns artifact-to-code.

Vocabulary: "decisions" means `## Problem` plus `## Decisions` (each `### D-###`, its `**Instead of:**` lines, and the citations in `## Problem`); "phases" means `## Scope` plus `## Phases` (each `T-<phase>.<seq>` criterion).

## Scope

Full pass on the first check of a record, or when the previous verdict on it was `DRIFT DETECTED`: read the whole record and every report, SDR, or charter it cites by path. Delta pass when the request names revised `D-###` ids and the previous verdict on this record was `ALIGNED`: read only the revised `### D-###` sections, the `## Revision log`, and the phases the amendment edited; do not re-read untouched decisions, phases, or cited sources. Record `scope: full` or `scope: delta (prior ALIGNED <date>, D-### list)`.

Caps: 30 finding rows on a full pass, 10 on a delta. Past the cap the record is structurally broken: emit one Critical row naming the structural problem ("plan has no acceptance criteria") and stop enumerating. The reference walk is one hop (record to cited report, SDR, or charter); never follow a report's own citations.

## Five checks, in order

1. Terminology. For every term used in both decisions and phases: find its entry under `artifacts/strategy/glossary/` (a missing entry is its own Minor row); if the two sections use the term for materially different things, one row; if a phase introduces a domain term absent from the decisions and not common English, one row.
2. Decision coverage. Every `D-###` has at least one phase criterion implementing it. A decision with zero criteria: Critical. A `D-###` cited by a phase that does not exist in the record: Critical.
3. Reverse coverage. Every phase implements at least one decision. A phase whose criteria implement none: Major (scope creep or an incomplete decision set; the architect decides which).
4. Driver-finding resolution. For each analyst report cited in `## Problem`, walk its `R-###` findings: a critical or major finding neither resolved by a phase nor marked out of scope in an `**Instead of:**` line is Major. For a cited SDR or charter, walk `TF-###` and `INV-###`: a `[TACTICAL DESIGN NEEDED]` item with no implementing phase is Major.
5. Reference integrity. For every `<short-title>#<ID>` reference in the record: target artifact missing is Critical; artifact present but id missing or `[withdrawn]` is Major; a prose reference with no id ("the auth audit's session-token finding") is Minor.

Evidence rules 2 and 3 of the skill apply: never infer a section's content from its heading, and try to disprove a row (the criterion may sit in a phase you have not read, or the wording may be elsewhere in the decisions) before writing it. A row that does not survive is dropped silently.

## Severity

- Critical: a decision no phase implements; a phase citing a decision that does not exist; a reference to an artifact that does not exist. The record cannot be implemented as written.
- Major: a phase implementing no decision; an unresolved critical or major driver finding; a reference whose id is missing or withdrawn.
- Minor: terminology drift on a term that already has a glossary entry; a prose reference that works but should be an id.

## Findings and verdict

Each row is a skill finding line with the record anchor as its location, for example `artifacts/plans/00007-event-store.md#D-003`. Name the check in the first sentence. `ALIGNED` when no Critical or Major row exists; `DRIFT DETECTED` otherwise. The token stands alone on the last line.

Example row: `- [Critical] artifacts/plans/00012-payments.md#D-003 — Decision coverage: D-003 mandates idempotent retries and no phase criterion implements them. Retries will duplicate payments on timeout. Add a phase with a T-criterion for the idempotency key, or withdraw D-003.`
