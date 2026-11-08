Fix two kernel gaps seen on 2026-11-08:
1. `picket mutate` picks its mutant from every change since the item's base, so when two items share a base, one item's mutation lands in the other item's files (20261108-admit-needs-a-touch-set got a mutant in scripts/docs.mjs, which only 20261108-session-switch-project-status-line changed). Limit mutate's candidates to the item's own commits and paths, the way `picket summary` already does.
2. When a cumulative review's only finding is a criterion's wording in an approved phase, the kernel routes `fix_findings` to the developer, and the architect refuses to reword the approved phase without a user gate. Give this case a step: route a plan-only finding to the user as a gate that offers the reword, and on approval send the architect the amendment, then the re-review, with no developer turn.

## Brief
purpose: Keep each item's mutation inside its own change, and give a wording-only review finding on an approved phase a user gate and an architect amendment instead of a developer turn.
in scope: mutate's candidate lines limited to the item's own commits and paths; a next step and gate for a cumulative CHANGES REQUIRED whose only findings are plan wording, leading to an architect amendment and a re-review.
out of scope: Other review routing; the summary verb; mutation operators.
