---
kind: design
lane: design
title: Admit ignores incidental migration and review words
date: 2026-11-09
audience: developer
sources: [work/20261109-stop-admit-misrouting-on-incidental-keywords/request.md, work/20261109-fix-budget-schema-session-admit-findings/request.md, work/20261109-consistency-determinism-performance-since-alpha-/request.md, src/lib/shared/admission/signals.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/admit.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/admit-labelled.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/verbs/admit/index.test.mts, bench/test/tasks.test.mjs, bench/tasks/gate-14-status-migration.json]
phases:
  - n: 1
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/verbs/admit/index.test.mts]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: 'IDENTIFIER'
      - path: src/lib/shared/admission/signals.mts
        pattern: 'JSON_SCHEMA'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: '20261109-fix-budget-schema-session-admit-findings'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'bench/schema/ledger-v2\.schema\.json'
      - path: src/lib/verbs/admit/index.test.mts
        pattern: '20261109-fix-budget-schema-session-admit-findings'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/verbs/admit/index.test.mts]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: 'REVIEW_WHETHER'
      - path: src/lib/shared/admission/signals.mts
        pattern: 'ASKED_CHANGE'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'I want to see if we messed with any of these'
      - path: src/lib/verbs/admit/index.test.mts
        pattern: 'messed with'
    tests: true
    drive: true
    security: true
---
# Design: Admit ignores incidental migration and review words

## Problem

`picket admit` decides a lane from keyword signals in `src/lib/shared/admission/signals.mts`, and two of them misfire on incidental words. `MIGRATION` (line 25) matches `schema` inside a work item id (`20261109-fix-budget-schema-session-admit-findings`) and inside a path segment (`bench/schema/`), so both requests answer `design` with "schema or data migration work"; a probe on base 203be6b confirmed both, and a prose "JSON schema" edit does the same. A review request answers `research` only when it hits a `RESEARCH` word: "I want to see if we messed with any of these" (`work/20261109-consistency-determinism-performance-since-alpha-/request.md`) hits none and falls to the `order` default. The binding constraints are that the `Signals` shape is part of the `picket admit` JSON output, that `security` keeps failing toward `design`, that `bench/test/tasks.test.mjs` pins every bench task's lane exactly, and that the labelled corpus keeps an agreement share of at least 0.9 (`admit-labelled.test.mts:12`).

## Decisions

### D-001: Mask identifiers and the phrase "JSON schema" before the migration test only
**Decision:** Infrastructural decision. `signalsOf` tests `MIGRATION` against a copy of the text in which every identifier and every "JSON schema" phrase is replaced by a space. An identifier is a run of word characters joined by at least one `-`, `.` or `/` (constant `IDENTIFIER = /\w+(?:[-./]\w+)+/g`), which covers work item ids, paths, file names and dotted names such as `lint.schema`; the phrase is the constant `JSON_SCHEMA = /\bjson[- ]schemas?\b/gi`. Because the mask already removes dotted names, `MIGRATION` drops its `(?<!\.)` and `(?!\.\w)` lookarounds and matches a plain `schema`. Every other signal still reads the unmasked text. A one-off run of this rule on base 203be6b kept all 134 corpus answers, kept every bench task lane, and still answered `design` for "Change the schema of the orders table.", "Add a schema for the export file." and "Run alter table on orders.".
**Instead of:** masking identifiers for every keyword signal: `SECURITY` must keep failing toward design (a work item id such as `20261004-credential-words-keep-the-security-flag` should still raise it), and `IRREVERSIBLE` and `DESIGN_QUESTION` carry hyphenated phrases of their own (`force-push`, `trade-off`) that the mask would erase.
**Risks:**
- **RISK-001** A real migration written only as a hyphenated compound ("plan the data-migration of the invoices file") loses the signal and answers `order` (probe result). Mitigation: no corpus entry or bench task words a migration that way, and the order lane's architect can still escalate to design.
- **RISK-002** The same incidental-word class remains for `DESIGN_QUESTION` and `RESEARCH` inside ids (`...-skills-design`, `...-report-...`). Mitigation: OQ-001 puts the widening to the user.

### D-002: A review-only request raises the existing research signal
**Decision:** Infrastructural decision. A new constant `REVIEW_WHETHER = /\b(see|check|review|verify|find out)\s+(if|whether)\b/i` joins `RESEARCH` as a trigger of `signals.research`, but only when the text carries no requested change: no change verb at a sentence start or after `and`, `then`, `please` or `also` (constant `ASKED_CHANGE`). `ASKED_CHANGE` is `CHANGE_VERB` without the `to` lead, built from one shared verb list so the two cannot drift; without `to`, "things that we need to adjust" reads as the object of the review, not a request. The existing guards (`SMALL_CHANGE`, `OPENS_WITH_CHANGE`, `NEW_SURFACE`) still apply, and `laneOf` in `lane.mts` is unchanged, so the answer keeps the reason "the request asks a question and changes no code". The `Signals` type and the admit JSON keep their fields.
**Instead of:** adding `see if` and `check whether` to `RESEARCH` itself: "Check if the CSV export still sorts newest first, and update the test." would then answer `research` (no small-change word, no change verb at the start), while it asks for a change.
**Risks:**
- **RISK-003** Research is decided before the heavy reasons in `laneOf`, so a review-only request that mentions a security word now answers `research` instead of `design`. Mitigation: research writes no code; a follow-up change is admitted again, and phase 2 carries `security: true` so it takes its own gate.
- **RISK-004** A change worded without any listed verb ("check if the file exists and create it") answers `research`. Mitigation: the researching skill hands a change back to admit; the corpus pins the boundary both ways.

### D-003: The pins live in the corpus, the signal tests and the admit verb tests
**Decision:** Infrastructural decision. Each request case becomes a labelled corpus entry, an exact signal assertion in `signals.test.mts`, and an exact lane assertion through `admit(root, text)` in `src/lib/verbs/admit/index.test.mts`. `lane.test.mts` gains nothing: `laneOf` does not change, so a hand-built `Signals` value would pin only what it already pins.
**Instead of:** an exact-answer test over the new corpus entries in `admit-labelled.test.mts`: it needs a marker field on corpus entries, and the share test plus the existing exact `pending` test already read every entry.

## Scope

**In:**
- The `MIGRATION` mask (`IDENTIFIER`, `JSON_SCHEMA`) and the review-only research trigger (`REVIEW_WHETHER`, `ASKED_CHANGE`) in `src/lib/shared/admission/signals.mts`.
- New labelled corpus entries, signal tests and admit verb tests for each case of the request.

**Out:**
- The fast/pending touch-set rule and the numbered-items rule from 20261109-fix-budget-schema-session-admit-findings.
- `lane.mts`, the `Signals` type, the admit JSON shape, and every other kernel verb.
- Masking for `SECURITY`, `IRREVERSIBLE`, `DESIGN_QUESTION`, `RESEARCH` and the other signals (OQ-001).

## Phase 1: Identifiers and JSON schemas are not migration work

**Touch set:**
- `src/lib/shared/admission/signals.mts`: mask before the migration test
- `src/lib/shared/admission/signals.test.mts`: exact migration signal pins
- `src/lib/shared/admission/admit-labelled.test.json`: three new labelled entries
- `src/lib/verbs/admit/index.test.mts`: end to end lane pins
- `src/lib/shared/admission/lane.mts`: migration reason text, read only
- `src/lib/shared/admission/admit-labelled.test.mts`: share and pending tests, read only
- `bench/test/tasks.test.mjs`: exact bench lanes, read only

**Changes:**
- `signals.mts`: add `IDENTIFIER` and `JSON_SCHEMA` as D-001 gives them; `migration` is `MIGRATION` tested on the text with both replaced by a space; `MIGRATION` loses its two lookarounds around `schema`. No other signal reads the masked text, and `Signals` keeps its fields.
- `signals.test.mts`: one new test asserting `migration` is false for "Fix the typo in the title of work item 20261109-fix-budget-schema-session-admit-findings.", "Remove the stale cost_usd field from bench/schema/ledger-v2.schema.json; the ledger no longer writes it." and "Remove the stale cost_usd field from the ledger JSON schema; the ledger no longer writes it.", and true for "Migrate the invoices file to one invoice per line.". The existing `lint.schema` test stays as it is.
- `admit-labelled.test.json`: three entries with a `why`: the work item id request labelled `pending`, the `bench/schema/` request labelled `order`, the "ledger JSON schema" request labelled `order` (no small-change word and no file named, so order is the default).
- `index.test.mts`: one test calling `admit(root, text)` on the repo fixture: the work item id request answers `pending`, both schema-file requests answer `order`, none of the three carries the reason "schema or data migration work", and "Change the schema of the orders table." answers `design` with that reason.

**Done when:**
- **T-1.1** `admit` answers `pending` for the work item id request and `order` for both JSON schema requests, and none of their reasons is "schema or data migration work" (the test in `src/lib/verbs/admit/index.test.mts`).
- **T-1.2** `signalsOf(...).migration` is true for "Change the schema of the orders table.", "Add a schema for the export file.", "Run alter table on orders." and "Migrate the invoices file to one invoice per line.", and false for the three request cases (`signals.test.mts`).
- **T-1.3** On the 134 corpus entries present at base 203be6b, admit's answers are unchanged. Before-image, captured on base before the first edit: the seven disagreements listed below. Comparison: a one-off run of every entry through `laneOf(signalsOf(...))` as `admit-labelled.test.mts` calls it, after the phase, lists the same seven and no other.
- **T-1.4** The corpus holds 137 entries and `admit-labelled.test.mts` passes; the agreement is 130 of 137 (0.949, minimum 0.9).
- **T-1.5** `bench/test/tasks.test.mjs` passes, so every bench task keeps its lane, `gate-14-status-migration` (whose prompt says "write a migration script") included.
- **T-1.6** After `npm run build`, `dist/bin/picket admit --human --text "Fix the typo in the title of work item 20261109-fix-budget-schema-session-admit-findings."` prints a line starting `lane: pending`; on base it printed `lane: design (schema or data migration work)`.

The seven base disagreements (label, then admit's answer, then the request's start):
- order, fast: "Split `src/http/handlers.ts` into one file per resource and update the router"
- design, order: "Add role permissions: only an admin may delete an invoice."
- design, fast: "lane: fast. Read the API key from `src/auth/keys.ts` instead of the config."
- design, order: "Drop the column `legacyId` from every stored invoice."
- design, order: "Add OAuth sign-in through the company identity provider for the HTTP routes."
- research, design: "How do the tests set up the invoices repository, and do they touch the real data file?"
- fast, research: "src/lib/verbs/mutate/index.mts:68 still uses" (the entry on the mutate base fallback)

## Phase 2: A review-only request answers research

**Touch set:**
- `src/lib/shared/admission/signals.mts`: review trigger for research
- `src/lib/shared/admission/signals.test.mts`: exact research signal pins
- `src/lib/shared/admission/admit-labelled.test.json`: five new labelled entries
- `src/lib/verbs/admit/index.test.mts`: end to end lane pins
- `src/lib/shared/admission/lane.mts`: research reason and order, read only
- `src/lib/shared/admission/admit-labelled.test.mts`: share and pending tests, read only
- `bench/test/tasks.test.mjs`: exact bench lanes, read only

**Changes:**
- `signals.mts`: add `REVIEW_WHETHER` and `ASKED_CHANGE` as D-002 gives them, with `CHANGE_VERB` and `ASKED_CHANGE` built from one shared verb list (so `CHANGE_VERB` matches exactly what it matches today). `research` becomes: declared research, or (`RESEARCH` matches, or `REVIEW_WHETHER` matches and `ASKED_CHANGE` does not) with no `SMALL_CHANGE` and no `OPENS_WITH_CHANGE`; then, as today, no `NEW_SURFACE`. `Signals` keeps its fields.
- `signals.test.mts`: one new test asserting `research` is true for the first paragraph of `work/20261109-consistency-determinism-performance-since-alpha-/request.md` (copied into the test as a string) and for "Check whether the pagination change regressed the page count.", and false for "Check whether the pagination change regressed the page count and fix it." and "Check if the CSV export still sorts newest first, and update the test.".
- `admit-labelled.test.json`: five entries with a `why`: that paragraph labelled `research`; "Review the changes since v1.0.0-alpha.5 and tell me if we regressed consistency, determinism or performance. No code changes yet." labelled `research`; "Check whether the pagination change regressed the page count." labelled `research`; the same sentence ending "and fix it." labelled `pending`; the CSV export sentence labelled `order`.
- `index.test.mts`: one test calling `admit(root, text)` on the repo fixture for the four sentences above and the paragraph, asserting the lanes the corpus gives them.

**Done when:**
- **T-2.1** `admit` answers `research` with the reason "the request asks a question and changes no code" for the paragraph and for the "Review the changes ... No code changes yet." sentence (`src/lib/verbs/admit/index.test.mts`).
- **T-2.2** `admit` answers `research` for "Check whether the pagination change regressed the page count.", `pending` for the same sentence ending "and fix it.", and `order` for "Check if the CSV export still sorts newest first, and update the test." (same test file).
- **T-2.3** `signalsOf(...).research` is true and false for the four cases the `signals.test.mts` change names, and every existing test in that file passes unchanged.
- **T-2.4** On the 134 corpus entries present at base 203be6b, admit's answers are unchanged: the comparison run of T-1.3, repeated after this phase, lists the same seven disagreements captured under Phase 1 and no other.
- **T-2.5** The corpus holds 142 entries and `admit-labelled.test.mts` passes; the agreement is 135 of 142 (0.951, minimum 0.9).
- **T-2.6** `bench/test/tasks.test.mjs` passes, so every bench task keeps its lane.
- **T-2.7** After `npm run build`, `dist/bin/picket admit --human --request work/20261109-consistency-determinism-performance-since-alpha-/request.md` prints a line starting `lane: research`; on base it printed `lane: order`.

## Open questions

- **OQ-001** Should the identifier mask of D-001 also cover `DESIGN_QUESTION` and `RESEARCH`? Both fire inside work item ids today (`20261029-kernel-groundwork-for-agents-and-skills-design` raises a design question, `20261018-adopt-comparison-report-improvement-ideas` raises research; checked on base 203be6b). Owner: the product owner. Fallback: only `MIGRATION` is masked in this item.

## Revision log
