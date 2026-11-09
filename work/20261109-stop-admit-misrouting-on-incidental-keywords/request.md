Tighten picket admit's keyword signals so they stop sending requests to heavier lanes on incidental words.
1. The MIGRATION pattern in src/lib/shared/admission/signals.mts matches the word inside a hyphenated identifier: a request that mentions work item 20261109-fix-budget-schema-session-admit-findings was routed to design as "schema or data migration work". Words inside work item ids, paths and other hyphenated or dotted identifiers must not fire the signal.
2. A request to edit a JSON schema file under bench/schema/ (removing one stale field) took the design lane as a data migration; a JSON schema file edit is not a schema or data migration.
3. The same review request got order when worded "I want to see if there are things that we need to adjust ... I want to see if we messed with any of these" and research when worded "Review the changes ... No code changes yet". A request that asks to see, check or review whether something regressed, and asks for no change, answers research.
The admit-labelled corpus and the lane tests pin each case.

## Brief
purpose: picket admit's keyword signals stop sending requests to heavier lanes on incidental words, and a review-only request answers research
in scope: src/lib/shared/admission (signals, lane rules), the admit-labelled corpus and the lane and admit tests
out of scope: The fast/pending touch-set rule and the numbered-items rule from 20261109-fix-budget-schema-session-admit-findings; other kernel verbs
