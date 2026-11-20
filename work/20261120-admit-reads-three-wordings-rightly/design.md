---
kind: design
lane: design
title: Admit reads three wordings rightly
date: 2026-11-20
audience: developer
sources: [work/20261120-admit-reads-three-wordings-rightly/request.md, src/lib/shared/admission/signals.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/signals.variants.test.mts, src/lib/shared/admission/admit-labelled.test.mts, src/lib/shared/admission/admit-labelled.test.json, test/support/variants.mts, test/repo/closures.test.mjs, work/20261118-planted-defect-benchmark-measures-the-tester/request.md, work/20261120-defect-rows-rerun-se4-graded-by-record/request.md, artifacts/strategy/decisions/00005-irreversible-actions-are-confirmed-point.md]
phases:
  - n: 1
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/signals.variants.test.mts, src/lib/shared/admission/admit-labelled.test.json]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: '\bbuild\b'
      - path: src/lib/shared/admission/signals.mts
        pattern: '\|irreversible\b|\birreversible\|'
        absent: true
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'picket test classify loses evidence when --evidence is not quoted'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'Build the planted-defect benchmark that measures the tester'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'Close three small leftovers:'
      - path: src/lib/shared/admission/signals.variants.test.mts
        pattern: 'Build the login form that keeps the session token in a cookie'
      - path: src/lib/shared/admission/signals.variants.test.mts
        pattern: 'Make src/lib/verbs/test/report.mts hash the api key before saving it'
      - path: src/lib/shared/admission/signals.variants.test.mts
        pattern: 'Create the password reset form named in SDR 00005, an irreversible action outside the repository'
    tests: true
    drive:
      - covers: T-1.1
        command: 'printf "%s\n" "Build the report view for invoices." | node dist/bin/picket.mjs admit --request - --human'
        exit_code: 0
        contains: ["lane: order"]
      - covers: T-1.2
        command: 'printf "%s\n" "The report-builder helper prints the wrong total; it should sum the lines." | node dist/bin/picket.mjs admit --request - --human'
        exit_code: 0
        contains: ["lane: order"]
      - covers: T-1.3
        command: 'printf "%s\n" "Close two leftovers named in SDR 00005 D-001 (only an irreversible action outside the repository)." | node dist/bin/picket.mjs admit --request - --human'
        exit_code: 0
        contains: ["lane: order"]
    security: false
---
# Design: Admit reads three wordings rightly

## Problem
`picket admit` picks a lane from regular expressions over the request text (`src/lib/shared/admission/signals.mts`), and three real requests got the wrong lane from one word each. A request opening with "Build" went to research because `OPENS_WITH_CHANGE` (signals.mts:41) is a second, shorter verb list than `CHANGE_VERBS` (signals.mts:36); a request naming `src/lib/verbs/test/report.mts` went to research because `RESEARCH` (signals.mts:23) matches "report" inside the file name; a request citing SDR 00005 D-001 ("only an irreversible action outside the repository") went to design because `IRREVERSIBLE` (signals.mts:28) matches the bare adjective. A scratch probe of the three fixes on base 0ffc70d7 turns each real text from research, research and design into order, and changes no other answer: none of the 148 labelled entries and none of the 24 `bench/tasks` prompts. The binding constraints are the brief's: the lane caps, `--touched` counting, the security-path rule and what each lane does stay as they are, and every labelled case and closure keeps passing.

## Decisions

### D-001: The opening verbs are the change verbs plus three opener-only verbs
**Decision:** Infrastructural decision. `OPENS_WITH_CHANGE` is built from a list derived from `CHANGE_VERBS` plus `build`, `convert` and `move`, so every change verb also counts as an opener and the two lists can no longer drift; this adds build, create, make, write and log as openers. One exception keeps an existing research ask: an opening "write a report" or "write the report", the phrase `RESEARCH` already names, is not a change opener, so "Write a report on how pricing picks the tier." stays research (signals.test.mts:104). `CHANGE_VERBS` itself is unchanged, because it also feeds `CHANGE_VERB` and `ASKED_CHANGE` (signals.mts:38 to 39), where "to build" or "and move" inside a "why does it fail" question would veto the debugging answer. It gives up a request opening "Create a report on X", which now reads as a change.
**Instead of:** adding build, create, make and write by hand to the existing opener list: it fixes the four words but keeps two lists that drifted once already.
**Risks:**
- **RISK-001** A question phrased as an order ("Make sense of how pricing works") now reads as a change and goes to order instead of research. Mitigation: `how (does|is|are)`, "explain" and "no code changes" still mark research when no change verb opens the request, as today for "Fix", "Add" and the rest; on base 0ffc70d7 the probe moved no labelled answer and no bench prompt.

### D-002: A research word counts only outside an identifier
**Decision:** Infrastructural decision. `isResearch` (signals.mts:107) tests `RESEARCH` on the text with identifier spans blanked by the existing `IDENTIFIER` pattern (signals.mts:26), the same way `isMigration` (signals.mts:114) already ignores "schema" inside `lint.schema` and paths. "report.mts", "report-builder" and "artifacts/reports" then ask nothing, while "How does report.mts pick its findings?" stays research through "how does". `asksOnlyToReview` reads the text as today. It gives up the rare request whose only research cue is a hyphenated or dotted word.
**Instead of:** treating any sentence that opens with a change verb ("Make classify refuse them too") as a change ask: broader, but it would move answers the brief does not name and the probe has not sized.
**Risks:**
- **RISK-002** A plain-word research ask written next to punctuation without a space ("see the report.Then") is blanked as an identifier. Mitigation: the labelled corpus and the bench prompts showed no such text; a miss lands in order, whose architect still reports.

### D-003: The irreversible signal reads actions, not the adjective
**Decision:** Infrastructural decision. `IRREVERSIBLE` (signals.mts:28) drops the bare word "irreversible" and keeps the action phrases: delete all or the data or records, drop table or column, force-push, purge. A request performs an irreversible step by naming the action; the adjective alone is how a request cites a rule, as the SDR 00005 citation did. The same narrower pattern serves `asksOnlyToReview`, so "See if we can drop table legacy_users safely." keeps the design lane. It gives up "Make the archive cleanup irreversible.", which now admits order instead of design.
**Instead of:** keeping the adjective but ignoring it inside parentheses or after a citation: a citation has no fixed shape ("as SDR 00005 D-001 says, only an irreversible action" carries no parenthesis), so the rule would catch one spelling and miss its siblings.
**Risks:**
- **RISK-003** A request that only says a step is irreversible, without naming one of the four actions, loses the design lane. Mitigation: the order-lane architect marks `[IRREVERSIBLE]` steps by its own contract and names the evidence before them; the labelled irreversible entries all name an action and keep design.

### D-004: The labelled set pins the real texts, and the security closure gains seeds for the new wordings
**Decision:** Infrastructural decision. The three real request texts join `admit-labelled.test.json` labelled order: the classify request as it was first admitted on 2026-11-18, the leftovers request of 2026-11-20 without its brief, and the planted-defect benchmark request with its first word "Build", the draft the lead reported admit sent to research before rewording it to "Add". Each text pins one fix: the probe shows each still fails with only the other two fixes applied. The one closure over this module, `admit security` (`signals.variants.test.mts`), gains three seeds that wrap a credential in each new wording, so a later edit to the opener, identifier or irreversible rules cannot drop the security signal unnoticed. No new closure is added for the narrowed research and irreversible signals.
**Instead of:** a new `admit irreversible` closure: `requestProse` runs every seed through `quotedSpans`, and admission ignores quoted prose for this signal on purpose (the labelled "never drop table invoices by hand" typo fix is fast), so such a closure could only pass with a new grammar, outside this brief.
**Risks:**
- **RISK-004** A sibling spelling of an irreversible action (such as "drop the column", already a labelled miss on base) stays open with no closure to name it. Mitigation: the miss stays visible in the corpus share test's miss list; widening the action list is a separate request.

## Scope
**In:**
- the opener list, the research-word reading and the irreversible pattern in `src/lib/shared/admission/signals.mts`
- unit tests for each in `src/lib/shared/admission/signals.test.mts`
- three labelled entries in `src/lib/shared/admission/admit-labelled.test.json`
- three seeds in `src/lib/shared/admission/signals.variants.test.mts`

**Out:**
- the lane caps (fast cap of 3 files and 2 numbered items) and `src/lib/shared/admission/lane.mts`
- how `--touched` is counted
- the security-path rule and the `SECURITY` and credential patterns
- what any lane does
- widening the irreversible action list (the labelled "Drop the column `legacyId`" miss)

## Phase 1: Admission reads the three wordings by what the request does
**Touch set:**
- `src/lib/shared/admission/signals.mts`: opener list, research, irreversible patterns
- `src/lib/shared/admission/signals.test.mts`: unit tests per wording
- `src/lib/shared/admission/admit-labelled.test.json`: three real request texts
- `src/lib/shared/admission/signals.variants.test.mts`: security closure seeds
- `src/lib/shared/admission/lane.mts`: read only, reasons text
- `src/lib/shared/admission/admit-labelled.test.mts`: read only, corpus rules

**Changes:**
- `signals.mts`: an opener verb list derived from `CHANGE_VERBS` plus `build`, `convert`, `move`; `OPENS_WITH_CHANGE` built from it, with an opening "write a report" or "write the report" excluded (D-001). `CHANGE_VERBS`, `CHANGE_VERB` and `ASKED_CHANGE` unchanged. `isResearch` tests `RESEARCH` on the text with `IDENTIFIER` spans blanked (D-002). `IRREVERSIBLE` without the alternative "irreversible" (D-003). The `Signals` type and `signalsOf`'s signature unchanged.
- `admit-labelled.test.json`: three entries, `lane: "order"`, each with a `why` naming the wording it pins (D-004). The texts, exactly:
  - the classify request, as admitted on 2026-11-18 (one paragraph, no trailing brief), exactly:

    > picket test classify loses evidence when --evidence is not quoted: the shell splits the text, classify keeps the first word ("POST") and ignores the rest, and the row is saved with one-word evidence. picket test note already refuses extra words. Make classify refuse them too (a usage error, nothing saved), and print the kernel's own hints with the flag text in double quotes (--evidence "<why>", --why "<text>") in src/lib/verbs/test/classify.mts, note.mts, case.mts, report.mts, src/lib/shared/route/route.mts and src/lib/shared/testing/cases.mts, so a tester that copies a hint gets a command that keeps its text.
  - the leftovers request: `work/20261120-defect-rows-rerun-se4-graded-by-record/request.md` up to, not including, its `## Brief` line.
  - the benchmark request: `work/20261118-planted-defect-benchmark-measures-the-tester/request.md` up to its `## Brief` line, with the first word "Add" replaced by "Build".
- `signals.test.mts`: one test per decision with the request texts named in T-1.1 to T-1.3.
- `signals.variants.test.mts`: three seeds appended to `CREDENTIAL_SENTENCES`, exactly "Build the login form that keeps the session token in a cookie.", "Make src/lib/verbs/test/report.mts hash the api key before saving it." and "Create the password reset form named in SDR 00005, an irreversible action outside the repository."

**Done when:**
- **T-1.1** `signalsOf` gives `research: false` for "Build the report view for invoices.", "Create the report command's help text." and "Make the report list newest first.", and `research: true` for "Write a report on how pricing picks the tier." and "Write the report on how pricing picks the tier."; `printf "%s\n" "Build the report view for invoices." | node dist/bin/picket.mjs admit --request - --human` prints `lane: order`.
- **T-1.2** `signalsOf` gives `research: false` for "The report-builder helper prints the wrong total; it should sum the lines." and "The hint in src/lib/verbs/test/report.mts prints --why unquoted; quote it.", and `research: true` for "How does report.mts pick its findings?" and "Explain how src/lib/verbs/test/report.mts counts cases."; admit prints `lane: order` for the report-builder text.
- **T-1.3** `signalsOf` gives `irreversible: false` for "Close two leftovers named in SDR 00005 D-001 (only an irreversible action outside the repository)." and `irreversible: true` for "Drop table legacy_users.", "Force-push the rebased branch.", "Purge cancelled invoices from storage." and "Delete all records older than seven years."; admit prints `lane: order` for the SDR text.
- **T-1.4** `admit-labelled.test.json` holds 151 entries, the three new ones labelled `order`, and the corpus test's `admitted` answers `order` for each of the three.
- **T-1.5** "Why does the test fail when I try to build the bundle?" still admits `none` with skill `debugging` (a unit test), so `CHANGE_VERBS` did not grow.
- **T-1.6** No other answer moves. Before-image, captured on base 0ffc70d7 with a scratch copy of `signals.mts`: the labelled corpus misses exactly seven entries, opening "Split `src/http/handlers.ts`", "Add role permissions", "lane: fast. Read the API key", "Drop the column `legacyId`", "Add OAuth sign-in", "How do the tests set up the invoices repository" and "src/lib/verbs/mutate/index.mts:68", and the 24 `bench/tasks/*.json` prompts get the lanes base gives them. The developer reruns that probe (base copy against the edited module, every labelled entry with `mentionedPaths` against `bench/fixture` and every bench prompt) and the block shows the same seven misses and no bench prompt whose lane changed.
- **T-1.7** `signals.variants.test.mts` holds the three seeds, and `TMPDIR=/tmp npm test` passes, `admit security stays closed` as written and under both families included.

## Open questions
none

## Revision log

