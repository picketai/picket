---
name: summarizing
disable-model-invocation: true
description: >
  Summarize the session's work into the repository's pull-request template, at most 4000
  characters, as copy-paste-ready Markdown: finds the template in the repo (or in each touched
  sub-repo of an umbrella), fills it from the branch's commits and the work item's record and
  verdicts, ticks the checklist items the evidence supports, and counts characters mechanically
  before delivering. Use when the user says "write the PR description", "summarize this
  branch", "PR body", or `/summarizing [branch or repo hint]`. User-invoked only: the PR
  description is written when the user decides the branch is done.
user-invocable: true
---

# Summarizing

Input: `$ARGUMENTS`, an optional branch, sub-repo path or work id. Empty: scope from the session's open work item; several unrelated branches → ask which.

## Repositories

`.claude/branching/manifest.yaml` present → umbrella: candidates are its repos, kept when the session touched their feature branch (`harness state <id>` records `branch`; `git -C <repo> worktree list` confirms). No manifest → probe once for two or more nested repos under `src/`; otherwise the project root. One summary per touched repo, each independently under 4000 characters, labelled.

## Template, first match wins

1. `.azuredevops/pull_request_template.md` (any case); 2. `.azuredevops/pull_request_template/*.md` (several → `default.md`, else ask); 3. `.github/PULL_REQUEST_TEMPLATE.md` or lowercase; 4. `.github/PULL_REQUEST_TEMPLATE/*.md` (same rule); 5. `PULL_REQUEST_TEMPLATE.md` at the root or under `docs/`; 6. none → the fallback skeleton `## Summary`, `## Changes`, `## Testing & Verification`, `## Risks / Rollback`, and say "no PR template found".

Keep every heading and required checklist item; tick `- [x]` only what the evidence satisfies; never delete or invent items. Strip HTML comments. Fill placeholders (`{ticket}`, `[JIRA-ID]`) from the branch name or the work item; leave the unresolvable ones visibly unfilled.

## Sources, in priority order

1. Git, the ground truth: `git -C <repo> log <default>..HEAD --oneline` and `git -C <repo> diff <default>...HEAD --stat`. Uncommitted work is named as such, never claimed.
2. The work item: `work/<id>/order.md` or `design.md` decisions, `verdicts.jsonl` (phase blocks carry tests, lint, verification; the reviewer's `APPROVED`), `research.md` hooks.
3. The conversation, for user rulings and deferred items the files do not carry.

Write for the PR reviewer: what changed, why, how it was verified, what is deliberately out of scope. Cite verdicts factually ("cumulative review APPROVED, 12/12 criteria PASS"). Failed or skipped tests are stated.

## Character limit, mechanical

Write the body to the scratchpad as `pr-summary-<repo>.md`; `tr -d '\r' < <file> | wc -m`. Over 4000: trim in order (a) prose in Changes bullets to one line each, (b) commit-list tails ("+N more"), (c) Risks and out-of-scope to one line each; never headings, required checklist items, the Summary paragraph, or verification evidence. Re-count until under.

## Deliver

One line per repo: repo, branch, template used, final count. Then the filled template in a ```markdown fence with nothing else inside it.
