---
kind: order
lane: order
title: PR reviews read the linked ticket
date: 2026-11-03
audience: developer
sources: work/20261103-pr-reviews-read-the-linked-ticket/request.md, src/lib/verbs/pullrequest/prepare.mts, src/lib/verbs/pullrequest/azdo.mts, src/lib/verbs/pullrequest/remote.test.mts, src/lib/hooks/guard/scope/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/shared/paths.mts, src/skills/reviewing/steps/pr.md, src/skills/reviewing/checklists/alignment.md, src/skills/ticketing/SKILL.md, src/skills/ticketing/steps/jira.md, src/agents/reviewer.md
phases:
  - n: 1
    files:
      - src/lib/verbs/pullrequest/tickets.mts
      - src/lib/verbs/pullrequest/tickets.test.mts
      - src/lib/verbs/pullrequest/prepare.mts
      - src/lib/verbs/pullrequest/remote.test.mts
      - src/lib/shared/paths.mts
      - src/lib/hooks/guard/scope/index.mts
      - src/lib/hooks/guard/scope/index.test.mts
    greps:
      - path: src/lib/verbs/pullrequest/tickets.mts
        pattern: 'export function ticketKeys\b'
      - path: src/lib/verbs/pullrequest/tickets.mts
        pattern: '/browse/'
      - path: src/lib/shared/paths.mts
        pattern: 'export function prTicketRel\b'
      - path: src/lib/shared/paths.mts
        pattern: 'export function isPrTicketRel\b'
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: 'isPrTicketRel\('
      - path: src/lib/verbs/pullrequest/prepare.mts
        pattern: 'ticketKeys\('
    tests: true
    drive: true
  - n: 2
    files:
      - src/skills/reviewing/steps/pr.md
      - src/skills/reviewing/checklists/alignment.md
      - src/agents/reviewer.md
      - src/skills/ticketing/steps/jira.md
      - src/skills/ticketing/SKILL.md
    greps:
      - path: src/skills/reviewing/steps/pr.md
        pattern: 'picket:ticketing --pull <KEY> --story --to'
      - path: src/skills/reviewing/steps/pr.md
        pattern: 'tickets: '
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'Alignment: PASS \(P-1; SHOP-123 AC-1, AC-3\)'
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'Alignment: title only \(SHOP-123 not readable: no Jira access\)'
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: 'N/A \(no description\)'
        absent: true
      - path: src/skills/reviewing/steps/pr.md
        pattern: 'N/A \(no description\)'
        absent: true
      - path: src/agents/reviewer.md
        pattern: 'tickets:'
      - path: src/agents/reviewer.md
        pattern: 'mcp__'
        absent: true
      - path: src/skills/ticketing/steps/jira.md
        pattern: '--to <path>'
      - path: src/skills/ticketing/SKILL.md
        pattern: '--to <path>'
    tests: true
    drive: false
  - n: 3
    files:
      - src/lib/verbs/pullrequest/azdo.mts
      - src/lib/verbs/pullrequest/azdo.test.mts
      - src/lib/verbs/pullrequest/prepare.mts
      - src/lib/verbs/pullrequest/remote.test.mts
      - src/skills/reviewing/steps/pr.md
    greps:
      - path: src/lib/verbs/pullrequest/azdo.mts
        pattern: '/workitems'
      - path: src/lib/verbs/pullrequest/azdo.mts
        pattern: 'export function workItemIds\b'
      - path: src/lib/verbs/pullrequest/prepare.mts
        pattern: 'work_items'
      - path: src/skills/reviewing/steps/pr.md
        pattern: 'no Azure Boards provider'
    tests: true
    drive: true
---
# Order: PR reviews read the linked ticket

## Problem
A pull request review grades the diff against the PR description's claims only (`src/skills/reviewing/checklists/alignment.md`, "Alignment: pull requests"), so a PR whose title says little is graded on code alone even when a Jira ticket carries its acceptance criteria. Only the lead holds the Jira MCP tools; the reviewer must stay without them (`src/agents/reviewer.md` frontmatter `tools: Read, Bash, Glob, Grep, SendMessage`), and ticket text is untrusted data under the `untrusted` rule. Two premises were checked against the code: `guard.scope` denies every model write under `.picket/state/` outside `scratch/` (`isHookOnlyState`, `src/lib/hooks/guard/scope/index.mts`), so the brief's folder `.picket/state/pr-<id>/` needs an allowance; and `picket:ticketing --pull <KEY> --story` writes only to `.picket/state/scratch/<KEY>.md` (`src/skills/ticketing/steps/jira.md`, Pull, step 2), so it needs a target.

## Decisions
### D-001: Ticket keys come from three positions, by a pure kernel function
**Decision:** A new module `src/lib/verbs/pullrequest/tickets.mts` exports `ticketKeys(meta: PullRequestMeta | null): TicketKey[]`, where `TicketKey = { key: string; from: ("description" | "branch" | "title")[] }`, one entry per key in first-seen order, `from` in the order description, branch, title. A key is `[A-Z][A-Z0-9_]+-\d+` and counts only in three positions: after `/browse/` in the description (`https://acme.atlassian.net/browse/SHOP-123`, query strings allowed after it); as the start of a source branch segment after `refs/heads/` is stripped, followed by the end, `-`, `_`, `/` or `.` (`feature/SHOP-123-x`); and leading the title, optionally in brackets, followed by `]`, `:`, whitespace or the end (`SHOP-123: add basket`, `[SHOP-123] add basket`). Everything else is bare text and yields nothing. A one-off run of these three patterns gave `SHOP-123` for each request example and nothing for `Fixes SHOP-124 and UTF-8` (description), `Fix UTF-8 decoding` (title) and `feature/utf-8-fix` (branch). Uppercase only, as Jira writes keys.
**Instead of:** one key-shaped pattern over the whole title and description: it yields `UTF-8` from `Fix UTF-8 decoding`, which the request says must be ignored.
**Risks:**
- **RISK-001** A title that opens with a key-shaped word (`UTF-8 decoding`) yields `UTF-8`. Mitigation: the pull fails visibly and the Alignment line names it as not readable; no grade rests on it.
- **RISK-002** A lowercase branch (`feature/shop-123-x`) is missed. Mitigation: the description link or the title prefix still finds the key; the cost is named here so a later item can widen the branch rule.

### D-002: Tickets live at `.picket/state/pr-<id>/<KEY>.md`, prepared by the kernel
**Decision:** The folder is the one the brief names. `src/lib/shared/paths.mts` exports `prTicketRel(reviewId: string, key: string): string` (returns `.picket/state/pr-412/SHOP-123.md`) and `isPrTicketRel(rel: string): boolean` (true only for `.picket/state/pr-<digits>/<key>.md`, one level deep, case-insensitive). `preparePullRequest` removes `.picket/state/<review_id>/` under the project root before listing keys, so a ticket from an earlier review of the same PR never reaches the reviewer, and `Prepared` gains `tickets: { key; from; path }[]`. `guard.scope` treats a path for which `isPrTicketRel` is true as model-writable; every other `.picket/state/` path keeps its current decision.
**Instead of:** `.picket/state/scratch/pr-<id>/`, which needs no guard change: it moves the folder the brief names, and the allowance is one predicate pinned by tests.
**Risks:**
- **RISK-003** The allowance lets the model forge hook state such as the saved review `.picket/state/pr-412.review.md` that `picket pullrequest post` reads. Mitigation: the predicate requires the `pr-<digits>/` folder and a key-shaped file name; a test pins that the review file, a deeper path and a non-key name stay denied.

### D-003: The lead pulls, the reviewer reads paths
**Decision:** In the PR step, the lead runs `picket:ticketing --pull <KEY> --story --to <path>` for each ticket prepare lists, with `<path>` from `tickets[].path`; ticketing's `--story` pull gains `--to <path>`, which writes the same story file there instead of `scratch/` and prints the path in place of the `picket open` flags. A pull that fails is recorded as `<KEY> not readable: <reason>` (`no Jira access` when the session has no Jira tools, else the error's last line). The reviewer's send gains one line, `tickets: <path>; <KEY> not readable: <reason>`, entries separated by `; `, or `tickets: none`. The reviewer's tools do not change.
**Instead of:** granting the reviewer the Jira tools: out of scope by the brief, a skill cannot widen an agent's tools, and untrusted ticket text would then sit next to tools that act on Jira.

### D-004: Ticket criteria join the PR claims, and the Alignment line names its sources
**Decision:** In scope `pr`, each readable ticket's acceptance criteria are numbered `<KEY> AC-1`, `AC-2` in source order and graded by the alignment procedure alongside the description's `P-n` claims. An acceptance criterion the diff neither implements nor contradicts is not graded, since a ticket may span several PRs; one the diff contradicts or implements in part is FAIL. The line names its sources in parentheses: `P` ids, then `; <KEY> AC-n, …` per ticket, then each unreadable ticket as the send names it. With no description claims and no readable ticket, the result is `title only (<why>)` and the code is graded alone; this replaces `Alignment: N/A (no description)`. Running the rule on the request's examples: claim P-1 passes, SHOP-123 has AC-1 to AC-3 and the diff touches AC-1 and AC-3, giving `Alignment: PASS (P-1; SHOP-123 AC-1, AC-3)`; an empty description with SHOP-123 unreadable gives `Alignment: title only (SHOP-123 not readable: no Jira access)`.
**Instead of:** grading every acceptance criterion: a ticket split over three PRs would fail the first two, and the request's first example passes without AC-2.
**Risks:**
- **RISK-004** A PR that claims to finish a ticket but skips AC-2 passes. Mitigation: a description that says `closes SHOP-123` is itself a claim `P-n`, and the missing AC-2 contradicts it, which is FAIL under the existing rule.

### D-005: Azure DevOps linked work items are listed, not pulled
**Decision:** On Azure DevOps with a PAT, prepare also reads the PR's linked work items (`GET <api_base>/workitems`) through a pure `workItemIds(json: unknown): number[]` in `azdo.mts`, and `Prepared` gains `work_items: number[]` and `work_items_reason: string | null`, in the same shape as `meta` and `meta_reason`. Linked work items are Azure Boards items with numeric ids, not Jira keys, and `picket:ticketing` has no Azure Boards provider (its Rules table), so the PR step names each as `work item <id> not readable: no Azure Boards provider` on the `tickets:` line. A failed fetch is reported, never fatal.
**Instead of:** reading a Jira key out of each work item's title: a second request per item for a convention no one stated; OQ-001 asks for the convention first.

## Scope
**In:**
- Ticket keys from the description's `/browse/` links, the source branch and the title prefix, plus Azure DevOps linked work item ids, in `picket pullrequest prepare`.
- The PR step pulling each key through `picket:ticketing` into `.picket/state/pr-<id>/<KEY>.md`, and the reviewer's send carrying `tickets:`.
- The reviewer grading ticket acceptance criteria and naming sources or the unreadable ticket on the Alignment line.

**Out:**
- Jira access for the reviewer agent; an Azure Boards ticketing provider.
- Creating, updating or posting anything to a ticket.
- Reviews of Picket's own work items (scopes other than `pr`).

## Phase 1: Prepare lists ticket keys and their paths
**Touch set:**
- `src/lib/verbs/pullrequest/tickets.mts`: new key rules and render line
- `src/lib/verbs/pullrequest/tickets.test.mts`: new unit tests for the rules
- `src/lib/verbs/pullrequest/prepare.mts`: tickets field, folder reset, render
- `src/lib/verbs/pullrequest/azdo.mts`: `PullRequestMeta` shape, read only
- `src/lib/verbs/pullrequest/remote.test.mts`: prepare end to end assertions
- `src/lib/shared/paths.mts`: ticket path and predicate
- `src/lib/hooks/guard/scope/index.mts`: allowance for ticket files
- `src/lib/hooks/guard/scope/index.test.mts`: pin allowance and denials

**Changes:** Add `tickets.mts` with `ticketKeys` (D-001) and `renderTickets(tickets)`, which returns `tickets: SHOP-123 (description, branch) → .picket/state/pr-412/SHOP-123.md` joined by `; `, or `tickets: none found`. Add `prTicketRel` and `isPrTicketRel` to `paths.mts` (D-002). In `preparePullRequest`, after the fetch succeeds, remove `statePath(root, review_id)` recursively with `force`, then set `tickets` from `ticketKeys(meta)` with each `path` from `prTicketRel`; `renderPrepared` adds the `renderTickets` line after the meta line. In `guard.scope`, a rel for which `isPrTicketRel` is true is not hook-only state; the unread-file check still applies.

**Done when:**
- **T-1.1** A unit test in `tickets.test.mts` calls `ticketKeys` with description `See https://acme.atlassian.net/browse/SHOP-123`, source ref `refs/heads/feature/SHOP-123-x` and title `SHOP-123: add basket`, and asserts exactly `[{ key: "SHOP-123", from: ["description", "branch", "title"] }]`.
- **T-1.2** A unit test asserts `ticketKeys` returns `[]` for description `Fixes SHOP-124 and UTF-8`, title `Fix UTF-8 decoding`, source ref `refs/heads/feature/utf-8-fix`, and returns `[]` for `null` meta.
- **T-1.3** A unit test asserts `[SHOP-7] x` as title gives `SHOP-7`, and two description links `/browse/SHOP-1` then `/browse/SHOP-2` give both keys in that order with `from: ["description"]`.
- **T-1.4** A unit test asserts `renderTickets` returns `tickets: none found` for `[]` and `tickets: SHOP-123 (description, branch) → .picket/state/pr-412/SHOP-123.md` for one ticket.
- **T-1.5** `remote.test.mts` places a file at `.picket/state/pr-7/OLD-1.md` under the project root before `preparePullRequest`, then asserts the file is gone and `prep.tickets` deep-equals `[]` (no PAT, so no meta).
- **T-1.6** A `guard/scope/index.test.mts` test asserts a Write to `.picket/state/pr-412/SHOP-123.md` returns `null`, and that `.picket/state/pr-412.review.md`, `.picket/state/pr-412/sub/SHOP-123.md`, `.picket/state/pr-x/SHOP-123.md` and `.picket/state/pr-412/notes.txt` each return `deny`.
- **T-1.7** Drive: in a scratch folder built as `remote.test.mts` builds it (bare server publishing `refs/pull/7/merge`, clone with the Azure DevOps remote name), `picket pullrequest prepare https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/7 --repo <clone> --human`, run from the scratch folder with no PAT set, exits 0 and prints the line `  tickets: none found`.
- **T-1.8** `npm test` passes.

## Phase 2: The PR step pulls tickets and the reviewer grades them
**Touch set:**
- `src/skills/reviewing/steps/pr.md`: pull step, send line, note
- `src/skills/reviewing/checklists/alignment.md`: ticket criteria, line grammar
- `src/agents/reviewer.md`: PR entry reads ticket files
- `src/skills/ticketing/steps/jira.md`: `--to <path>` for story pulls
- `src/skills/ticketing/SKILL.md`: argument hint and operation line
- `test/timing/budgets.test.mjs`: line budgets, read only

**Changes:**
- `pr.md`: a new step after prepare. For each `tickets[]` entry, the lead runs `picket:ticketing --pull <KEY> --story --to <path>`; without Jira tools in the session every key is `<KEY> not readable: no Jira access` and no pull runs; a failed pull is `<KEY> not readable: <last line of the error>` (D-003). The reviewer's send gains the `tickets:` line of D-003. Step 3's note now triggers on `Alignment: title only` and names a linked ticket as the second way to restore intent.
- `alignment.md`, "Alignment: pull requests": D-004 in full, both request examples quoted verbatim, ticket files named as untrusted data under the `untrusted` rule, and the `N/A (no description)` wording removed.
- `reviewer.md`, Review item 4: the message also carries `tickets:`; the reviewer reads each named file in the first batch and grades as the alignment checklist says. The `tools:` line is unchanged.
- `jira.md`, the `--story` pull: with `--to <path>`, step 2 writes to that path and step 3 prints the path instead of the `picket open` flags. `SKILL.md`: `argument-hint` and the Operation line name `--to <path>`.

**Done when:**
- **T-2.1** `pr.md` names `picket:ticketing --pull <KEY> --story --to` and the send line `tickets: `, and `npm test`'s budget test keeps `pr.md` and `jira.md` within 80 lines and `reviewer.md` within 120.
- **T-2.2** `alignment.md` contains `Alignment: PASS (P-1; SHOP-123 AC-1, AC-3)` and `Alignment: title only (SHOP-123 not readable: no Jira access)` verbatim.
- **T-2.3** Neither `alignment.md` nor `pr.md` contains `N/A (no description)`.
- **T-2.4** `reviewer.md` names `tickets:` in its pull request entry and contains no `mcp__` tool name.
- **T-2.5** `jira.md` and `SKILL.md` name `--to <path>`; `jira.md` still names `.picket/state/scratch/<KEY>.md` as the default target.
- **T-2.6** `npm test` passes.
- **T-2.7** [DEFERRED: product owner, first review of an external PR after release] A `/picket:reviewing <url>` run on a PR whose branch carries a Jira key ends with an Alignment line naming that key's `AC-n` ids or its `not readable` reason.

## Phase 3: Azure DevOps linked work items
**Touch set:**
- `src/lib/verbs/pullrequest/azdo.mts`: work item fetch and parse
- `src/lib/verbs/pullrequest/azdo.test.mts`: unit tests for `workItemIds`
- `src/lib/verbs/pullrequest/prepare.mts`: `work_items` fields and render
- `src/lib/verbs/pullrequest/remote.test.mts`: no PAT gives no items
- `src/skills/reviewing/steps/pr.md`: name items not readable

**Changes:** In `azdo.mts`, add `workItemIds(json: unknown): number[]`, which reads `value[].id` (a string or a number) and drops anything not a positive integer, and `pullRequestWorkItems(pr, pat)` returning `{ ids: number[]; reason: string | null }`: GitHub or no PAT gives `{ ids: [], reason: null }`, a failed request gives `[]` with the error message. `Prepared` gains `work_items` and `work_items_reason` (D-005); `renderPrepared` adds `  work items: 4711, 4712 (Azure Boards, not pulled)` when any exist. `pr.md`: each id goes on the `tickets:` line as `work item <id> not readable: no Azure Boards provider`.

**Done when:**
- **T-3.1** A unit test asserts `workItemIds({ count: 2, value: [{ id: "4711", url: "u" }, { id: 4712 }] })` returns `[4711, 4712]`.
- **T-3.2** A unit test asserts `workItemIds` returns `[]` for `null`, `{}`, `{ value: "x" }` and `{ value: [{ id: "abc" }, { id: -1 }] }`.
- **T-3.3** `remote.test.mts` asserts `prep.work_items` deep-equals `[]` and `prep.work_items_reason` is `null` with no PAT.
- **T-3.4** `pr.md` names `no Azure Boards provider` on the `tickets:` line rule, and `npm test` passes.
- **T-3.5** Drive: the T-1.7 command still exits 0 and prints no `work items:` line.
- **T-3.6** [DEFERRED: QA, release QA pass] `picket pullrequest prepare <url> --human` on a real Azure DevOps PR with one linked work item prints `work items: <its id> (Azure Boards, not pulled)`.

## Open questions
- **OQ-001** The response shape of `GET …/pullRequests/<id>/workitems` (`{ count, value: [{ id, url }] }`) is recalled, not read from Microsoft's reference or a live server, and whether teams that link work items also carry a Jira key in the work item's title is unknown. Owner: product owner. Fallback: phase 3 ships as written, with `workItemIds` dropping anything it cannot read, and T-3.6 checks the shape at the release QA pass.

## Revision log
