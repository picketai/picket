When the midpoint checkpoint review (scope checkpoint) returns CHANGES REQUIRED, `picket next` has no fix step and keeps printing review_checkpoint again; only the cumulative review routes to fix_findings (src/lib/shared/work/next-step.mts findingsOpen/findingsStep). Make a checkpoint CHANGES REQUIRED route to fix_findings for the developer, with the send naming the checkpoint review file (reviews/checkpoint.md; today send.mts hardcodes reviews/cumulative.md), then back to review_checkpoint once the developer's PHASE DONE lands, and only then to the next phase. The action text says "cumulative review findings" and should fit both reviews. Add unit tests for the routing and the send.

## Brief
purpose: A checkpoint review that returns CHANGES REQUIRED leads to a developer fix and a re-review instead of repeating the review request
in scope: next-step routing for a checkpoint rejection, the fix_findings send naming the review file that rejected, the action text, unit tests
out of scope: the cumulative review's routing and stall rules, the skills' prose, the reviewer's checklists
