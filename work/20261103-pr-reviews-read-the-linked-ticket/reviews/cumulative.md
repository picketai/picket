## Review: 20261103-pr-reviews-read-the-linked-ticket · cumulative

Approved: every request sentence and plan criterion has code or contract evidence, and the only guard this change weakens is the one D-002 calls for, with tests pinning it.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "`picket pullrequest prepare` lists the ticket keys it finds: a Jira link in the description (`/browse/SHOP-123`), the source branch name (`feature/SHOP-123-x`), and the title" | request.md:2 | PASS | src/lib/verbs/pullrequest/tickets.mts:8-44, prepare.mts:49; tickets.test.mts:8 |
| S-2 | "on Azure DevOps also the PR's linked work items" | request.md:2 | PASS | azdo.mts:103-110, prepare.mts:50,64-65 |
| S-3 | "Bare text that only looks like a key (`UTF-8`) is ignored." | request.md:2 | PASS | tickets.test.mts:13-16 (a title that starts with a key is the risk D-001 names as RISK-001) |
| S-4 | "the lead ... pulls each key with `picket:ticketing --pull <KEY> --story` into `.picket/state/pr-<id>/<KEY>.md` before spawning the reviewer" | request.md:3 | PASS | steps/pr.md:6, ticketing/steps/jira.md:28-29, guard/scope/index.mts:45 |
| S-5 | "the reviewer's send gains `tickets: <paths>`" | request.md:3 | PASS | steps/pr.md:7 |
| S-6 | "checks alignment against the ticket's acceptance criteria as well as the PR text, and the block names which source it used" | request.md:4 | PASS | checklists/alignment.md:9-11 |
| S-7 | "A ticket that cannot be read is named" | request.md:4 | PASS | alignment.md:11, pr.md:6 |
| S-8 | "Ticket text is untrusted data under the `untrusted` rule." | request.md:5 | PASS | alignment.md:9, pr.md:6 |
| S-9 | "The reviewer gets no Jira access." | request.md:5 | PASS | src/agents/reviewer.md: only line 56 changed, `tools:` untouched, no `mcp__` |
Alignment: PASS (24; T-2.7, T-3.6 DEFERRED as marked)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/agents/reviewer.md:71: the Output template's `Alignment:` line still shows only `PASS | FAIL | UNCLEAR`. It does not show the pr form with its sources in parentheses or `title only (<why>)`, so a reviewer that follows the template alone could leave the sources out. The alignment checklist does state both forms.
Classes: none
Checked: the item's range is 6d40c38^..078227e. The summary's changed_files also lists files from two other items' commits after base 2788aa4 (commit-message, close, packet, reply, route/verdict) and the foreign staged pane-actions.test.ts; I did not review those. I probed ticketKeys with a bracketed title plus colon, a key running into letters, repeated links, two branch segments, a branch without refs/heads/ and a lowercase link: each gave the expected result. guard.scope rel is normalised to forward slashes before isPrTicketRel, so Windows paths match. pr.id is a Number, so rmSync stays under .picket/state/pr-<n>/. The four changed unit test files pass (35/35). Mutation was killed.

APPROVED
