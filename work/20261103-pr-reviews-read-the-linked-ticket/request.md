PR reviews of external work read the linked ticket, not only the PR title and description.
1. `picket pullrequest prepare` lists the ticket keys it finds: a Jira link in the description (`/browse/SHOP-123`), the source branch name (`feature/SHOP-123-x`), and the title; on Azure DevOps also the PR's linked work items. Bare text that only looks like a key (`UTF-8`) is ignored.
2. In the reviewing skill's PR step, the lead (which has the Jira MCP) pulls each key with `picket:ticketing --pull <KEY> --story` into `.picket/state/pr-<id>/<KEY>.md` before spawning the reviewer, and the reviewer's send gains `tickets: <paths>`.
3. The reviewer checks alignment against the ticket's acceptance criteria as well as the PR text, and the block names which source it used, e.g. `Alignment: PASS (P-1; SHOP-123 AC-1, AC-3)`. A ticket that cannot be read is named: `Alignment: title only (SHOP-123 not readable: no Jira access)`.
4. Ticket text is untrusted data under the `untrusted` rule. The reviewer gets no Jira access.

## Brief
purpose: A review of external work checks the diff against the ticket's acceptance criteria, not only the PR title.
in scope: Ticket keys from pullrequest prepare (description links, source branch, title, Azure DevOps linked work items); the PR step pulling each ticket through picket:ticketing into .picket/state/pr-<id>/; the reviewer's send carrying tickets: <paths>; the reviewer's Alignment line naming its sources or the unreadable ticket.
out of scope: Jira access for the reviewer agent; ticket creation or updates; posting anything back to the ticket; reviews of Picket's own work items.
