---
kind: order
lane: order
title: Commit messages share one checked shape
date: 2026-11-03
audience: developer
sources: request.md, preflight.txt, src/lib/shared/route/commit.mts, src/lib/shared/route/apply.mts, src/lib/shared/work/block.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/close/close.mts, src/skills/implementing/SKILL.md
phases:
  - n: 1
    files:
      - src/lib/shared/commit-message.mts
      - src/lib/shared/commit-message.test.mts
      - src/lib/shared/work/block.mts
      - src/lib/shared/work/block.test.mts
      - src/lib/shared/route/commit.mts
      - src/lib/shared/route/apply.mts
      - src/lib/verbs/packet/packet.mjs
      - src/lib/verbs/route/index.test.mts
      - test/cli/route.test.mjs
      - test/kernel/packet.test.mjs
    greps:
      - path: src/lib/shared/commit-message.mts
        pattern: '"style"'
      - path: src/lib/shared/commit-message.mts
        pattern: '\b72\b'
      - path: src/lib/shared/route/commit.mts
        pattern: 'checkCommitMessage\('
      - path: src/lib/shared/route/apply.mts
        pattern: 'phaseCommitMessage\('
      - path: src/lib/shared/route/commit.mts
        pattern: 'phase \$\{phase\} of'
        absent: true
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/hooks/guard/block/index.mts
      - test/hooks/guard.block.test.mjs
      - src/lib/hooks/route/verdict/index.mts
      - src/lib/hooks/route/verdict/index.test.mts
      - src/lib/verbs/packet/packet.mjs
      - test/kernel/packet.test.mjs
      - src/skills/implementing/SKILL.md
      - src/lib/hooks.mts
      - docs/reference/hooks.md
    greps:
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'checkCommitMessage\('
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'and the umbrella'
        absent: true
      - path: src/skills/implementing/SKILL.md
        pattern: '72 characters'
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/index.test.mts
      - test/cli/close.test.mjs
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: 'checkCommitMessage\('
      - path: src/lib/verbs/close/close.mts
        pattern: 'chore: close \$\{id\}'
        absent: true
    tests: true
    drive: true
---
# Order: Commit messages share one checked shape

## Problem
Picket builds commit messages in three places with three rules: `commitMessage` in `src/lib/shared/route/commit.mts:51` takes the developer's `Commit:` line or silently falls back to `<phase title>, phase n of <id>`, `defaultCloseMessage` in `src/lib/verbs/close/close.mts:47` writes `chore: close <id>`, and `picket close --message` commits whatever it is given. Nothing checks the shape before the user approves, and two of the three put the work item id into history. A further constraint is in the hooks: `guardBlock` returns early when `stop_hook_active` is set (`src/lib/hooks/guard/block/index.mts:83`), and `routeTurn` skips a repeated verdict on a continued stop before it saves the block (`src/lib/hooks/route/verdict/index.mts:109`), so a block corrected after a bounce never replaces the saved one today.

## Decisions

### D-001: One pure module owns the shape and the normalising
**Decision:** A new `src/lib/shared/commit-message.mts` exports the ten types (`feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`), the limit 72, and `checkCommitMessage(raw: string): { message: string } | { problem: string }`. It normalises only the subject line, in this order: trim, drop a trailing `(staged…)` tail, drop one matching pair of wrapping backticks, double or single quotes, drop one trailing period. It then accepts `type`, an optional `(scope)` without spaces or parentheses, an optional `!`, then `: ` and a non-empty subject, with the whole first line at most 72 code points. The body (lines after the first) passes through unchanged. `parseBlock` also reads a `**Commit:**` line as the `Commit` field, and `proposedCommit` returns the raw subject and body, so the `(staged…)` stripping has one copy. Every Picket commit and every pre-approval check calls this one function. Run on examples: `` `feat(x): y.` (staged; approval commits it) `` gives `feat(x): y`; `3f9c2a1`, `Feat: y`, `feat(x):y` and a 73-character subject are refused; a 72-character one passes.
**Instead of:** validating inside `parseBlock`: `picket close --message` is not a block, so the close path would need a second copy.
**Risks:**
- **RISK-001** Accepting `!` and any scope characters admits shapes the user did not list. Mitigation: both are part of Conventional Commits, which the request names; the unit test pins exactly what passes.

### D-002: No valid message, no commit
**Decision:** The route computes the phase message once with `phaseCommitMessage(root, snap, phase)` in `src/lib/shared/route/commit.mts` and passes it to `commitCheckouts` and `commitPhase`. When it returns a problem (no `Commit:` line, or one that fails D-001), `applyChanges` drops the approval through the existing `withoutApproval` path, as a refused nested commit does today: no commit in any repo, no `N.approved` marker, no verdict row, and an applied line naming the problem. The `COMMIT_SHA` test and the title-based fallback go away.
**Instead of:** a generated fallback such as `chore: <phase title>`: the request removes the silent fallback, and a generated subject cannot know the change's real type.
**Risks:**
- **RISK-002** Kernel tests that approve a phase without a saved block (28 approvals in `src/lib/verbs/route/index.test.mts` alone) now see a refusal. Mitigation: phase 1 gives those fixtures a block with a valid `Commit:` line; a shared fixture helper in that test file keeps the change to one place.

### D-003: One message for every repo of a phase
**Decision:** Nested checkout commits and the main repo commit (code and work record) use the same full message, subject and body. In a single repo the code and `work/<id>/` stay one commit, as `commitPhase` already does with `add: [workRel(id)]`.
**Instead of:** a subject-only message for the main repo's record commit: it gives up the body for no gain, and an identical message keeps "the record reuses the code commit's subject" true by construction.

### D-004: A corrected block after a bounce replaces the saved one
**Decision:** On a continued stop where `repeatsLastRow` holds, `routeTurn` still calls `saveDeveloperBlock` before returning, so the block the developer re-emits after a `guard.block` bounce becomes `phases/N.block.md`, and no second verdict row is appended. `guard.block` bounces a developer `PHASE DONE` block whose `Commit:` line is missing or fails `checkCommitMessage`, with the function's problem text.
**Instead of:** having `route.verdict` refuse to route a `PHASE DONE` with a bad message: it would add a second refusal path inside a hook, while D-002 already refuses at the approval.
**Risks:**
- **RISK-003** `guardBlock` skips continued stops, so a second bad block passes the hook. Mitigation: D-002 refuses the approval and the gate packet shows the problem before the user answers.

### D-005: Close message from the title, shortened at a word
**Decision:** The default close message is `chore: close <title>` from `state.title`. A title longer than 59 characters (72 minus the 13 of `chore: close `) is cut at the last space within 59, or at 59 when it has none, so the default always passes D-001. `picket close --message` goes through `checkCommitMessage`; a problem refuses the close before `markDone`, so the item stays as it was. The longest title among the 157 items in `work/` today is 57 characters.
**Instead of:** refusing a close whose title is too long: the default is Picket's own text, and a refusal at the end of a finished item leaves the user to invent a message.

## Scope
**In:**
- `src/lib/shared/commit-message.mts` and its use by phase commits (nested checkouts and main repo), the gate packet, `guard.block` and `picket close`.
- Saving the corrected developer block after a bounce.
- The per-repo commit lines in the gate packet; one sentence on the shape in the implementing skill.
**Out:**
- Rewriting existing history.
- Rules for commits the user makes by hand.
- Any trailer or work item id in a commit; the item title's own words are the user's and pass through as written.
- Checking the lead's `## Expedited:` block (see OQ-002).

## Phase 1: The commit-message function and phase commits
**Touch set:**
- `src/lib/shared/commit-message.mts`: new shape and normalising module
- `src/lib/shared/commit-message.test.mts`: unit tests for the function
- `src/lib/shared/work/block.mts`: bold label, raw proposedCommit
- `src/lib/shared/work/block.test.mts`: staged-tail test moves to the function
- `src/lib/shared/route/commit.mts`: phaseCommitMessage, no fallback
- `src/lib/shared/route/apply.mts`: refuse approval on a problem
- `src/lib/verbs/packet/packet.mjs`: commit line shows checked message
- `src/lib/verbs/route/index.test.mts`: fixtures gain a Commit line
- `test/cli/route.test.mjs`: fixtures gain a Commit line
- `test/kernel/packet.test.mjs`: sha fixtures become messages
- `test/cli/cli.test.mjs` [INFERRED]: one approval without a block
- `src/lib/shared/work/snapshot.test.mts` [INFERRED]: one approval without a block
**Changes:** Add the module of D-001. In `block.mts`, let the field matcher accept `**Commit:**` for the `Commit` field only (other labels are read by raw line in `guard.block`, so widening them would split the two readers), and drop the `STAGED_TAIL` strip from `proposedCommit`. In `commit.mts`, replace the private `commitMessage` with exported `phaseCommitMessage` (block via `readBlock`, `parseBlock`, `proposedCommit`, then `checkCommitMessage`), remove `COMMIT_SHA`, and take the message as a parameter in `commitCheckouts` and `commitPhase`. In `apply.mts`, compute it once before `commitNestedFirst` and on a problem return `withoutApproval(changes, phase, <problem line>)`. In `packet.mjs`, the existing single `commit` line shows the checked message, or `not committable: <problem>`, keeping today's `(staged; …)` suffix until phase 2. Update the fixtures that approve without a valid `Commit:` line; the T-5.1 test asserts a real subject instead of `Pricing, phase 1 of <id>`.
**Done when:**
- **T-1.1** A unit test passes `` `feat(x): y.` (staged; approval commits it) `` and `"fix: a."` to `checkCommitMessage` and gets `feat(x): y` and `fix: a`; a message with an indented body keeps the body after a blank line.
- **T-1.2** A unit test gets a problem for `3f9c2a1`, `Feat: y`, `feat(x):y`, `Pricing, phase 1 of x` and `feat: ` plus 67 letters (73 characters), and a message for `feat: ` plus 66 letters (72); every problem text names all ten types and 72.
- **T-1.3** A unit test reads `**Commit:** feat(x): y` with `parseBlock` and `proposedCommit` returns `feat(x): y` after `checkCommitMessage`.
- **T-1.4** A route test with a nested checkout and a block whose `Commit:` line has a body shows `git log -1 --format=%B` identical in the worktree and in the main repo.
- **T-1.5** A route test approving a phase whose block has no `Commit:` line, and one whose line is `Pricing, phase 1`, leaves HEAD unchanged in every repo, writes no `1.approved`, appends no verdict row, and returns an applied line containing the problem.
- **T-1.6** The existing single-repo test in `test/cli/route.test.mjs` still finds `phases/1.approved` in the phase commit (code and record one commit).
- **T-1.7** `npm test` passes, and in a temporary repo `picket route <id> --verdict approved --agent user --phase 1` on a block with `Commit: update stuff` prints the refusal and `git log -1` is unchanged.

## Phase 2: Check before the gate and show the message per repo
**Touch set:**
- `src/lib/hooks/guard/block/index.mts`: bounce a bad Commit line
- `test/hooks/guard.block.test.mjs`: bounce tests, fixtures gain Commit
- `src/lib/hooks/route/verdict/index.mts`: re-save block on continued stop
- `src/lib/hooks/route/verdict/index.test.mts`: re-save test
- `src/lib/verbs/packet/packet.mjs`: per-repo commit lines
- `test/kernel/packet.test.mjs`: per-repo and body assertions
- `src/skills/implementing/SKILL.md`: one sentence on the shape
- `src/lib/hooks.mts`: guard.block summary names the check
- `docs/reference/hooks.md`: rebuilt from the summary
**Changes:** In `blockProblems`, for a developer `PHASE DONE`, parse the block with `parseBlock` and add the `checkCommitMessage` problem, or `the block has no "Commit:" line`, to the bounce. In `routeTurn`, when `continued && repeatsLastRow(...)`, call `saveDeveloperBlock(info, id, phase, text, ctx.root)` before returning null (D-004). In `packet.mjs`, replace `approvalCommits` with lines from `phaseCommitMessage` and `nestedCheckoutPaths`: one line per repo in commit order, `<checkout dir>  <subject>` for each nested checkout, then `main repo  <subject>`; with no nested checkout, the subject alone. Body lines follow, one per line, indented under the field and cut to the width. A problem shows `not committable: <problem>`. Under the template in `implementing/SKILL.md`, add one sentence: the subject is a Conventional Commits line of at most 72 characters, and `guard.block` bounces another shape naming the types. Update the `guard.block` summary in `src/lib/hooks.mts`, run `npm run build`, and stage the regenerated `docs/reference/hooks.md` before `npm test`.
**Done when:**
- **T-2.1** A hook test bounces a developer `PHASE DONE` block with `Commit: Pricing, phase 1`; the reason names all ten types and 72.
- **T-2.2** A hook test bounces a `PHASE DONE` block with no `Commit:` line, passes one with `` Commit: `feat(x): y.` ``, and passes a `PHASE STALLED` block and a reviewer block that have no `Commit:` line.
- **T-2.3** A hook test runs `route.verdict` twice for phase 1, the second with `stop_hook_active: true` and a different `Commit:` line; `phases/1.block.md` holds the second text and the verdict log has one `PHASE DONE` row.
- **T-2.4** A packet test on a nested-checkout item prints one commit line naming the checkout dir and one naming `main repo`, both with the subject, and each body line on its own line.
- **T-2.5** A packet test on a single repo prints the subject alone on the commit line, without `(staged`; one with `Commit: update stuff` prints `not committable:`.
- **T-2.6** `docs/reference/hooks.md` in the git index matches the build output (`git diff --exit-code docs/reference/hooks.md` after `npm run build` is empty).
- **T-2.7** `npm test` passes, and `picket packet <id>` on a temporary nested-checkout item prints the per-repo lines.

## Phase 3: The close commit goes through the same function
**Touch set:**
- `src/lib/verbs/close/close.mts`: title default, check, refuse early
- `src/lib/verbs/close/index.test.mts`: default message assertion
- `test/cli/close.test.mjs`: subject assertions use the title
**Changes:** Replace `defaultCloseMessage(id)` with one built from `state.title` per D-005. In `close`, after `refuseUnlessClosable` and before `markDone` (in both the repo and the no-repo path), run `message ?? default` through `checkCommitMessage`; a problem throws `Refused` with the problem text and the id; otherwise commit the normalised message and return it as `message`. Update the tests that assert `chore: close ${id}`.
**Done when:**
- **T-3.1** A CLI test closes an order item titled `Orders` without `--message` and `git log -1 --format=%s` is `chore: close Orders`.
- **T-3.2** A unit test with a 70-character title of several words gets a default of at most 72 characters that ends with a whole word of the title and passes `checkCommitMessage`.
- **T-3.3** A CLI test closes a fast item with `--message` set to `` `fix: a.` `` (backticks included) and the commit subject is `fix: a`.
- **T-3.4** A CLI test runs `picket close <id> --message "update stuff"`: the command refuses with the problem, HEAD is unchanged, and `picket state <id>` still shows `status: open`.
- **T-3.5** `npm test` passes, and in a temporary repo `picket close <id> --human` prints `Commit:` or the phase range with the title-based subject in `git log -1`.

## Open questions
- **OQ-001** The request's "`**` around the label" is read as the field label (`**Commit:** feat: y`), not bold around the type. Owner: product owner. Fallback: the field-label reading of D-001.
- **OQ-002** `guard.block` skips `## Expedited:` blocks, so a bad fast-lane message surfaces only when `picket close --message` refuses after the user's `c`. Should the hook check the lead's Expedited `Commit:` line too? Owner: product owner. Fallback: no; the close refusal prints the problem and the lead asks the user for a message.
- **OQ-003** `work/20261103-one-shape-for-every-commit-message` holds the same request word for word. Owner: product owner. Fallback: this item is the one implemented; the other is abandoned by the lead.

## Revision log
