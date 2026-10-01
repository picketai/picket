---
kind: design
lane: design
title: External sources and traced cumulative review
date: 2026-10-01
audience: developer
sources: [request in the lead message, .claude/lib/admit.mjs, .claude/lib/review.mjs, .claude/lib/git.mjs, .claude/lib/work.mjs, .claude/lib/next.mjs, .claude/lib/route.mjs, .claude/lib/preflight.mjs, .claude/lib/pr.mjs, .claude/lib/yaml-lite.mjs, .claude/bin/harness.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/guard.bash.mjs, .claude/hooks/inject.state.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/lib/transcript.mjs, .claude/agents/reviewer.md, .claude/skills/reviewing/SKILL.md, .claude/skills/reviewing/steps/10-alignment.md, .claude/skills/ordering/steps/40-review.md, .claude/skills/designing/steps/20-crosscheck.md, .claude/branching/manifest.yaml, .claude/settings.json, test/budgets.test.mjs]
phases:
  - n: 1
    files: [.claude/lib/repos.mjs, .claude/lib/review.mjs, .claude/lib/git.mjs, .claude/lib/work.mjs, .claude/bin/harness.mjs, .claude/skills/ordering/steps/10-order.md, .claude/skills/designing/steps/10-design.md, test/kernel/review.test.mjs, test/kernel/work.test.mjs]
    greps:
      - path: .claude/lib/work.mjs
        pattern: "request\\.md"
      - path: .claude/lib/review.mjs
        pattern: "nestedRepos"
      - path: .claude/skills/ordering/steps/10-order.md
        pattern: "new --lane order .*--text"
      - path: .claude/skills/designing/steps/10-design.md
        pattern: "new --lane design .*--text"
    tests: true
    drive: true
  - n: 2
    files: [.claude/skills/reviewing/steps/15-traced.md, .claude/agents/reviewer.md, .claude/skills/reviewing/SKILL.md, .claude/skills/ordering/steps/40-review.md, .claude/skills/ordering/SKILL.md, .claude/skills/designing/SKILL.md, CLAUDE.md, test/kernel/pr.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/skills/ordering/steps/40-review.md
        pattern: "cumulative-reviewer"
      - path: .claude/skills/ordering/steps/40-review.md
        pattern: "You are reviewing a change you did not write"
      - path: .claude/skills/ordering/steps/40-review.md
        pattern: "opus"
      - path: .claude/agents/reviewer.md
        pattern: "15-traced\\.md"
      - path: .claude/agents/reviewer.md
        pattern: "Leave it:"
      - path: .claude/skills/reviewing/SKILL.md
        pattern: "15-traced\\.md"
      - path: .claude/skills/reviewing/steps/15-traced.md
        pattern: "Regression:"
    tests: true
    drive: false
  - n: 3
    files: [.claude/lib/config.mjs, .claude/lib/admit.mjs, .claude/lib/review.mjs, .claude/lib/sources.mjs, .claude/bin/harness.mjs, .claude/lib/preflight.mjs, .claude/hooks/inject.state.mjs, .claude/harness.json, CLAUDE.md, test/kernel/config.test.mjs, test/kernel/sources.test.mjs]
    greps:
      - path: .claude/lib/config.mjs
        pattern: "export function loadConfig"
      - path: .claude/harness.json
        pattern: "HARNESS_SOURCE_ANALYSIS"
      - path: .claude/bin/harness.mjs
        pattern: "case \"source\""
      - path: .claude/lib/preflight.mjs
        pattern: "source:"
    tests: true
    drive: true
  - n: 4
    files: [.claude/lib/sources.mjs, .claude/lib/work.mjs, .claude/bin/harness.mjs, .claude/lib/next.mjs, .claude/lib/packet.mjs, .gitignore, .claude/skills/ordering/steps/10-order.md, .claude/skills/designing/steps/10-design.md, .claude/skills/ordering/SKILL.md, .claude/skills/designing/SKILL.md, test/kernel/sources.test.mjs, test/kernel/next.test.mjs]
    greps:
      - path: .claude/lib/next.mjs
        pattern: "resolve_sources"
      - path: .gitignore
        pattern: "work/\\*/sources/"
      - path: .claude/skills/ordering/steps/10-order.md
        pattern: "--ticket"
      - path: .claude/skills/designing/steps/10-design.md
        pattern: "--ticket"
    tests: true
    drive: true
  - n: 5
    files: [.claude/lib/sources.mjs, .claude/bin/harness.mjs, .claude/lib/review.mjs, .claude/agents/architect.md, test/kernel/sources.test.mjs, test/kernel/review.test.mjs]
    greps:
      - path: .claude/lib/review.mjs
        pattern: "live_sha256"
      - path: .claude/agents/architect.md
        pattern: "harness source add"
    tests: true
    drive: true
  - n: 6
    files: [.claude/hooks/guard.scope.mjs, .claude/hooks/guard.bash.mjs, .claude/hooks/lib/source-paths.mjs, test/hooks/hooks.test.mjs, test/kernel/sources.test.mjs]
    greps:
      - path: .claude/hooks/guard.scope.mjs
        pattern: "sources\\.yaml"
      - path: .claude/hooks/guard.bash.mjs
        pattern: "source-paths\\.mjs"
    tests: true
    drive: true
---
# Design: External sources and traced cumulative review

## Problem

The cumulative reviewer checks the code against the architect's artifact only (`.claude/agents/reviewer.md:21`, `:29`; `reviewing/steps/10-alignment.md:11`). The original request is not saved (`state.yaml` holds id, lane, title, status, base), the Jira story never reaches the work item, and the same reviewer instance that cross-checked the plan runs the final pass, so a plan that misread the story passes review. `review-summary` diffs only the project root (`.claude/lib/git.mjs:36`, `.claude/lib/review.mjs:121`); verified in a scratch umbrella, the root reports a changed nested repo as the single untracked entry `src/Rent/` and never names the changed file. The requirements live in a separate analysis repository with several worktrees and branches, whose path differs per machine and must never be written. Binding constraints: the kernel stays dependency-free (yaml-lite, Node built-ins, git), hooks stay under 200 ms cold (`test/budgets.test.mjs:17`), agents stay the four named roles, and step files stay under 80 lines.

## Decisions

### D-001: One project config loader with named sources
**Decision:** Infrastructural decision. A new `.claude/lib/config.mjs` exports `loadConfig(root)` returning `{ security_paths: string[], sources: Source[], error: string|null }`, where `Source` is `{ name, env, root: string|null, reason: string|null }`. `.claude/harness.json` declares sources by name with the env var that holds the root: `{ "sources": { "analysis": { "env": "HARNESS_SOURCE_ANALYSIS" } } }`. The root is `process.env[env]`, resolved to an absolute path; unset or missing gives `root: null` with the reason. The value is set in the `env` block of the untracked `.claude/settings.local.json`, the pattern `AZDO_PAT` already uses (`.claude/lib/pr.mjs:11`). `securityPaths` moves into `config.mjs`; `admit.mjs` drops `loadProjectConfig` and re-exports `securityPaths` so `route.mjs:5` keeps its import; `review.mjs` drops its private copy (`:76`).
**Instead of:** a root path written in `harness.json`: the file is tracked and the path differs per machine.
**Risks:**
- **RISK-001** Both loaders swallow a malformed `harness.json` today and return `{}`; with sources declared there, silence hides a broken config. Mitigation: `loadConfig` keeps the defaults but sets `error`, and preflight reports it as `warn` (Phase 3).

### D-002: The request and the story are immutable files of the work item
**Decision:** The work item aggregate gains two value files written once by `harness new` and never rewritten: `work/<id>/request.md` (from `--text` or `--request <file|->`, byte for byte) and `work/<id>/story.md` (from `--ticket <KEY> --story <file>`, byte for byte). The ticket key goes into the existing `source` field of `state.yaml` (`.claude/lib/work.mjs:110`); the state schema does not change. The kernel never calls Jira: the lead fetches the story with the Atlassian MCP tools it already has and writes the description and acceptance criteria unedited to a scratch file it passes in. Both files become kernel-owned in `guard.scope` (Phase 6).
**Instead of:** the request as a field in `state.yaml`: yaml-lite holds scalars and one level of nesting, not multi-line prose, and `state.yaml` is rewritten on every route.
**Risks:**
- **RISK-002** The lead paraphrases the story instead of pasting it. Mitigation: the step text names the exact Jira fields to copy and forbids editing; the reviewer quotes `story.md`, so a paraphrase shows in its citations.
- **RISK-003** An escalated item (order to design) gets a new id and loses the request. Mitigation: the design step passes the same `--text` to `harness new`; the order item is abandoned, as today.

### D-003: The review summary spans nested repositories
**Decision:** Infrastructural decision. A new `.claude/lib/repos.mjs` exports `nestedRepos(root)`: the entries of `.claude/branching/manifest.yaml` whose `path` is not `.`, else every immediate child of `src/` holding a `.git` entry. `harness new` records each nested repo's HEAD in `work/<id>/repos.yaml` (no file when there are none). `reviewSummary` then diffs each nested repo in its work tree (the linked worktree on `refs/heads/<state.branch>` when the item has a branch, else the repo path) against the recorded base, falling back to `merge-base HEAD <default_branch>`; paths are prefixed with the repo path, the root's untracked `src/Rent/` entry is dropped, line counts are summed, and a `repos` list names every touched repo with its work tree and base. `reviewSummaryRange` (pull requests) is unchanged.
**Instead of:** no recorded base, always `merge-base` against the default branch: an item worked in the main tree on the default branch has `merge-base = HEAD` and its commits vanish from the review.
**Risks:**
- **RISK-004** The manifest carries inline `#` comments that yaml-lite may reject. Mitigation: a parse error falls back to the `src/` scan; a test parses the manifest shape this repo has.
- **RISK-005** Items opened before Phase 1 have no `repos.yaml`. Mitigation: the merge-base fallback, reported as `base_from: "merge-base"`.
- **RISK-006** `pr.mjs` `locateRepo` keeps its own scan list (`src`, `repos`, `packages`, `.`). Cost: two discovery rules until a later item merges them; out of scope here.

### D-004: The cumulative review is a fresh, story-first reviewer on opus
**Decision:** `ordering/steps/40-review.md` spawns, for `scope: cumulative` only, a new reviewer instance named `cumulative-reviewer` with model `opus`, never the instance that ran the cross-check or a checkpoint; its own re-reviews continue `cumulative-reviewer`. It follows a new `reviewing/steps/15-traced.md`. Reading order is fixed: `request.md`, `story.md` and the snapshots under `sources/` first; then it writes its own requirements checklist `S-1`, `S-2` from the story prose (the request when no story exists), each row quoting the prose and citing `file#heading:line`; then the diff across every repo in the summary; the plan last, for the `Alignment` and `Decisions` lines. The block adds a Requirements table, a `Regression:` line (behaviour of the surrounding module at base versus head: callers and existing tests of every changed exported symbol), `Likelihood: high|medium|low` and `Leave it: <PR note>` on every Critical and Major finding, and a `Sources:` line copied from the summary. A story requirement with no code anywhere is in range, the one exception to the `changed_files` rule. An `S` row at `FAIL` blocks `APPROVED` like a `T` row; an `S` row at `UNCLEAR` does not block, because the developer cannot fix an ambiguous story and `route.mjs` has no user path to accept a reviewer verdict: it goes on a `Questions:` line that the lead copies into the closing block for the user. Phase, checkpoint and cross-check reviews stay plan-bound and unchanged.
**Instead of:** continuing the existing reviewer with a richer prompt: its context already holds the plan and the earlier verdicts, which anchors it on the architect's reading of the story, the exact failure diagnosed.
**Risks:**
- **RISK-007** Opus on every cumulative review raises cost. Mitigation: one cumulative review per item; phase-level reviewers stay on sonnet.
- **RISK-008** A per-spawn model override is a Claude Code contract this repo has never used (OQ-001). Mitigation: the step names the fallback; the criterion checks the step text, not the runtime.
- **RISK-009** Story prose maps loosely to code and floods the table with `UNCLEAR`. Mitigation: cap 15 rows as in `10-alignment.md`; `UNCLEAR` rows reach the user as questions in the closing block instead of looping the developer.

### D-005 (r2): Source references resolve by one deterministic rule
**Decision:** Domain logic in `.claude/lib/sources.mjs`. A `Reference` value object is `{ source, path, anchor: string|null, pin: branch|null }`; a `Candidate` is `{ label, worktree: path|null, branch, commit, sha256, dirty }`. Tokens are extracted in this order: the target of every markdown link `[text](target)` (percent-escapes decoded, a leading `./` dropped), then path-like words in the prose (`seg/seg[/seg…]` or a backticked name with an extension). From each token, wrapping punctuation, a `?query`, a `#fragment` (kept as `anchor`, so `docs/rent/fees.md#late-fees` resolves `docs/rent/fees.md`) and a `:line` suffix are stripped; tokens with the same path merge into one reference. At most 200 per story; `<source>@<branch>:<path>` is a pin. A token that has a slash and an extension but still fails the path shape (a `..` segment, characters outside the shape) is never looked up and goes to `unmatched`, so no path-like token disappears without a trace. Candidates are the working copy of every worktree from `git worktree list --porcelain` where the file exists, plus `git cat-file blob <branch>:<path>` for every local branch not checked out anywhere. `sha256` is taken over the content with CRLF turned into LF. Rule: one candidate, use it; several with one hash, use the main worktree's (else the first in worktree order); several hashes, the reference is `ambiguous`; none, an unpinned token is plain text (kept in an `unmatched` list when it has a slash and an extension) and a pinned one fails listing every place searched. An ambiguous intake makes `harness next` return a new action `resolve_sources` (actor user) before `write_artifact`; `harness source pick <id> <ref> <label>` records the choice so nobody asks twice. A reference found later is an `OQ-###` for the architect or an `UNCLEAR` row for the reviewer, never a guess.
**Instead of:** a mandatory prefix or pin on every reference: the stories are harness-agnostic prose written by people who will not adopt a syntax.
**Risks:**
- **RISK-010** `core.autocrlf=true` on this machine (seen in the scratch probe) makes a working copy and its blob differ byte-wise. Mitigation: the LF-normalised hash; the snapshot keeps the raw bytes.
- **RISK-011** Ordinary words such as `and/or` look like paths. Mitigation: they match nowhere and stay plain text; the 200-token cap bounds the git lookups.
- **RISK-012** Remote-only branches are not searched. Mitigation: stated limit in the step text; a pin to a local branch covers the case.

### D-006: A snapshot record per work item
**Decision:** The kernel copies each resolved document's raw bytes to `work/<id>/sources/<source>/<path>` and writes `work/<id>/sources.yaml`: a `refs` list whose items carry `ref`, `source`, `path`, `status` (`resolved` | `ambiguous`), `chosen_by` (`single` | `identical` | `user` | `pin`), `worktree`, `branch`, `commit`, `sha256`, `dirty`, `snapshot`, and while ambiguous an inline `candidates: [label, …]` list (yaml-lite allows one nesting level inside list items); plus a top-level `unmatched` list. `sources.yaml` is committed with the phase commits; the snapshot bytes are ignored by git (`work/*/sources/` in `.gitignore`) until OQ-002 is settled. `review-summary` re-resolves every resolved ref against its recorded worktree or branch and reports `sources: [{ ref, snapshot_sha256, live_sha256, moved }]`.
**Instead of:** recording path and commit only and reading live files: a dirty worktree file has no commit and can change mid-item, so the architect and the reviewer would read different text.
**Risks:**
- **RISK-013** Committing the snapshot bytes would copy the analysis repo into this repo's history `[IRREVERSIBLE]` once pushed. Mitigation: ignored by default; flipping it is OQ-002, a user decision.
- **RISK-014** A large document bloats the work item. Mitigation: files over 1 MB are recorded with `snapshot: null` and the reason.

### D-007: Agents reach sources only through the kernel
**Decision:** Infrastructural decision. The kernel reads source files with Node and git directly, so no Claude Code permission is needed per worktree. Agents read the snapshots and discover with `harness source find <name> <substring>` and `harness source grep <name> <regex> [--path <prefix>]`, both across every worktree and local branch, printing `{ path, places: [label…], line?, text? }` with a 200-hit cap and an overflow count; the architect adds a later reference with `harness source add <id> <ref>` under the D-005 rule. Preflight warns on an unreachable source and SessionStart names each source with its root. `additionalDirectories` stays optional, main worktree only, and the harness never writes it.
**Instead of:** each worktree in `additionalDirectories` so agents use Read: worktrees come and go, each needs a permission entry, and a direct Read bypasses the snapshot so two agents can cite two versions.
**Risks:**
- **RISK-015** An agent with a broad Read grant (`settings.local.json` allows `Read(//d/workspace/development/**)`) reads a live file instead of the snapshot. Mitigation: the reviewer and architect texts say cite snapshots only; the `Sources:` line exposes drift.

### D-008 (r2): Write protection on every source worktree
**Decision:** Infrastructural decision on a guard path. `guard.scope` denies Write and Edit whose absolute target lies under a source root or any of its linked worktrees; the worktree list is read from the filesystem (`<common git dir>/worktrees/*/gitdir`), never by spawning git, to stay inside the hook budget. In `guard.bash`, a segment is under a source when its effective cwd, `-C`, `--work-tree` or `--git-dir` value, any path operand or any write-redirect target lies under one; such a segment is judged by its own source policy, not by the general `safe` class (which treats `tag`, `reflog` and `remote` as safe whatever their arguments). Git: only a strict read-only list is allowed, namely `log`, `show`, `diff`, `blame`, `status`, `ls-files`, `ls-tree`, `rev-parse`, `grep`, `cat-file`, `worktree list`, and `branch` or `tag` when bare or listing (`--list`, `-l`, `-a`, `-r`, `-v`, no other positional argument); every other git form is denied. Other commands: a write redirect, a `DENY_ROOTS` command, or a known writer (`cp`, `mv`, `tee`, `touch`, `mkdir`, `ln`, `sed -i`, `npm`, `yarn`, `pnpm`, `dotnet`, `Copy-Item`, `Move-Item`, `New-Item`, `Set-Content`, `Out-File`) is denied; a segment in the general `safe` class is allowed; anything else (for example `awk`, `less`) falls through to the permission prompt instead of a hard deny. `guard.scope` also makes `request.md`, `story.md`, `sources.yaml`, `sources/` and `repos.yaml` kernel-owned. Paths compare lowercased with forward slashes on Windows, as `hooks/lib/project-root.mjs` does.
**Instead of:** extending only the git deny list: `cp`, `mv`, `sed -i` or `npm` run inside a source worktree would still reach a permission prompt the user can approve by habit.
**Risks:**
- **RISK-016** The env var is unset in the hook process, so the guard cannot see the source and fails open. Mitigation: hooks inherit the settings `env`; preflight warns when a declared source has no root.
- **RISK-017** Two ways to list worktrees (filesystem in hooks, porcelain in the kernel). Cost: a second parser to keep in step; a test checks both agree on a temp repo with two linked worktrees.

## Scope

**In:**
- One config loader and named sources with an env root.
- `request.md`, `story.md`, snapshots and `sources.yaml` per work item, with the opening-gate choice.
- `harness source find|grep|add|pick`, the preflight warning, the SessionStart line.
- Write and mutating-command denial under every source worktree.
- A fresh, story-first cumulative reviewer on opus; a review summary across nested repos with source drift.

**Out:**
- The kernel calling Jira; the reviewer reaching Jira.
- Remote-only branches of a source.
- Changes to phase, checkpoint and cross-check reviews.
- Merging `pr.mjs` `locateRepo` with `nestedRepos`.
- Adding `.claude/hooks/` to `security_paths`.
- Ticket intake for the fast and research lanes.

## Phase 1: Review summary across nested repos, request saved

**Touch set:**
- `.claude/lib/repos.mjs`: new, nested repos and bases
- `.claude/lib/review.mjs`: `reviewSummary` spans nested repos
- `.claude/lib/git.mjs`: worktree lookup, merge-base helpers
- `.claude/lib/work.mjs`: `createWork` writes request, bases
- `.claude/bin/harness.mjs`: `new --text|--request`, summary line
- `.claude/branching/manifest.yaml`: read only, shape to parse
- `.claude/skills/ordering/steps/10-order.md`: pass request to `harness new`
- `.claude/skills/designing/steps/10-design.md`: pass request to `harness new`
- `test/kernel/review.test.mjs`: new, nested-repo summary
- `test/kernel/work.test.mjs`: request and bases files

**Changes:**

`repos.mjs` exports `nestedRepos(root) -> Array<{ path, default_branch: string|null }>` (D-003 rule), `recordBases(id, root)` and `readBases(id, root) -> Record<path, sha>`. The file it writes:

```yaml
repos:
  - path: src/Rent
    base: 1a2b3c4d5e6f...
```

`git.mjs` adds `worktreeOnBranch(repo, branch) -> string|null` (from `git worktree list --porcelain`) and `mergeBase(repo, a, b) -> string|null`; `changedSince` is reused per repo, unchanged.

`createWork({ ..., request })` writes `request.md` exactly as given when `request` is a non-empty string, then calls `recordBases`. `harness new` reads it from `--text` or `--request <file|->` with the existing `readRequest`; both are optional.

`reviewSummary` output gains `request` (`"work/<id>/request.md"` or `null`) and `repos: [{ path, worktree, base, base_from: "recorded"|"merge-base", files }]`, one entry per touched repo plus any skipped one with `base: null` and `skipped: "<reason>"`. Nested paths join `changed_files` prefixed with the repo path; a root entry equal to a nested repo path plus `/` is removed; `lines_added`, `lines_removed`, `size`, `concerns` and `security_path` are computed over the merged list. The `--human` line adds `repos <n>`.

Both lane steps change the `harness new` line to `--text "<the request, verbatim>"`, with `--request <file>` named for a request that carries quotes or newlines.

**Done when:**
- **T-1.1** In a temp umbrella whose nested repo `src/Rent` has a modified tracked file, `reviewSummary` lists `src/Rent/<file>` in `changed_files` and does not list `src/Rent/`.
- **T-1.2** A commit made in the nested repo after `createWork` appears in `changed_files`, with `base_from: "recorded"` and the base taken from `work/<id>/repos.yaml`.
- **T-1.3** With `branch: feat-x` in state and a linked worktree of `src/Rent` on `feat-x`, `repos[0].worktree` is that worktree's path and its uncommitted change is counted.
- **T-1.4** Without `repos.yaml`, the nested repo is diffed from `merge-base HEAD <default_branch>` and reports `base_from: "merge-base"`.
- **T-1.5** `harness new --lane order --title t --text "<text with \" and newline>"` writes `work/<id>/request.md` equal to the text byte for byte; without `--text` or `--request` no `request.md` exists.
- **T-1.6** For a work item in this repository (manifest holds only `.`), `changed_files`, `size` and `base` match what the trunk version printed before the phase, and `repos` is `[]`.
- **T-1.7** `npm test` passes.

## Phase 2: A fresh, story-first cumulative reviewer

**Touch set:**
- `.claude/skills/reviewing/steps/15-traced.md`: new, cumulative reading order
- `.claude/agents/reviewer.md`: cumulative entry and output lines
- `.claude/skills/reviewing/SKILL.md`: range exception, layout entry
- `.claude/skills/reviewing/steps/10-alignment.md`: read only, table and cap
- `.claude/skills/ordering/steps/40-review.md`: fresh opus `cumulative-reviewer`
- `.claude/skills/ordering/SKILL.md`: closing block carries questions
- `.claude/skills/designing/SKILL.md`: closing block carries questions
- `CLAUDE.md`: rule 3 names the fresh spawn
- `.claude/hooks/route.verdict.mjs`: read only, heading regex
- `.claude/lib/pr.mjs`: read only, `parseFindings` regex
- `test/kernel/pr.test.mjs`: findings with the new fields
- `test/hooks/hooks.test.mjs`: cumulative block from `cumulative-reviewer`

**Changes:**

`15-traced.md` (at most 80 lines) is the cumulative procedure, loaded instead of `10-alignment.md` for `scope: cumulative`; the size load table still applies for the pattern files. Its order is fixed (D-004):

1. Read `request.md`, `story.md` and every file under `work/<id>/sources/` named in `sources.yaml`; nothing else of the work item yet.
2. Write the requirements checklist from the story prose (the request when there is no story): `S-1`, `S-2` in source order, each quoting the sentence and citing `story.md#<heading>:<line>` or `sources/<source>/<path>#<heading>:<line>`. Cap 15 rows. The source documents carry no ids; never invent `R-###` for them.
3. Read the diff of every repo in the summary's `repos` list with `git -C <worktree> diff <base>`, and grade each `S` row PASS, FAIL or UNCLEAR with `path:line` evidence. A requirement with no code anywhere is FAIL even outside `changed_files`.
4. Regression: for each changed exported symbol, read it at `<base>` with `git show`, its callers and its existing tests; record each behaviour change neither the story nor the plan asks for.
5. Read the plan last: the `Alignment:` and `Decisions:` lines as today, PASS rows as a count.
6. Copy `Sources:` from the summary's `sources` field (`none` when absent, `moved: <ref> (<sha8> to <sha8>)` when `moved` is true). A moved source is reported, never a blocker.

Report only: no file changes, no full test suite. No `request.md`: write `Requirements: N/A (no request saved)` and run step 5 alone.

`reviewer.md` Entry names `15-traced.md` for cumulative and says the plan is read last. Its output block gains, for cumulative only, `Requirements: PASS (<n>) | FAIL: S-2 <why>`, the requirements table (`| ID | Requirement | Source | Result | Evidence |`), `Regression: none | <n> unrequested behaviour changes`, `Sources: …` and `Questions: none | S-4 <what is ambiguous>`. Every Critical and Major line keeps the existing shape and ends with `Likelihood: high|medium|low. Leave it: <one-line PR note>.` The verdict rule: an `S` row at FAIL blocks; UNCLEAR rows go to `Questions:` and never block.

`reviewing/SKILL.md` adds the range exception for `S` rows and the `15-traced.md` layout line, and stays under 150 lines.

`40-review.md` splits by scope. Cumulative: spawn a new reviewer named `cumulative-reviewer`, model `opus`, whose message opens with "You are reviewing a change you did not write. You have no context beyond what is below.", then `work`, `scope: cumulative`, `summary`, `step: .claude/skills/reviewing/steps/15-traced.md`; re-reviews continue `cumulative-reviewer`. Checkpoint: continue `reviewer` as today. Both closing blocks add `Questions: <the reviewer's line>` when it is not `none`.

`CLAUDE.md` rule 3 adds that the cumulative review is the one fresh spawn.

**Done when:**
- **T-2.1** `15-traced.md` exists, has at most 80 lines, and lists `request.md`, `story.md` and `sources/` in step 1 and the plan in step 5.
- **T-2.2** `40-review.md` spawns `cumulative-reviewer` with model `opus` and the fixed opening sentence for `scope: cumulative`, and continues `reviewer` for `scope: checkpoint`.
- **T-2.3** `reviewer.md` shows the `Requirements`, `Regression`, `Sources` and `Questions` lines and the `Likelihood` and `Leave it` fields, and has at most 120 lines.
- **T-2.4** `parseFindings` returns the path, line and full tail for a Major line ending in `Likelihood: medium. Leave it: note in PR.` (new case in `test/kernel/pr.test.mjs`).
- **T-2.5** A `SubagentStop` payload whose block starts `## Review: <id> · cumulative` and ends `APPROVED`, from an agent named `cumulative-reviewer`, routes with scope `cumulative` and `harness next` says `close` (new case in `test/hooks/hooks.test.mjs`).
- **T-2.6** `CLAUDE.md` stays under 2048 bytes and `npm test` passes.

## Phase 3: Config loader, source discovery, preflight and SessionStart

**Touch set:**
- `.claude/lib/config.mjs`: new, the one loader
- `.claude/lib/admit.mjs`: drop loader, re-export `securityPaths`
- `.claude/lib/review.mjs`: drop private `securityPaths` copy
- `.claude/lib/route.mjs`: read only, import stays valid
- `.claude/lib/sources.mjs`: new, worktrees, candidates, find, grep
- `.claude/bin/harness.mjs`: `source find` and `source grep`
- `.claude/lib/preflight.mjs`: per-source reachability check
- `.claude/hooks/inject.state.mjs`: name sources at session start
- `.claude/harness.json`: new, declares `analysis`
- `CLAUDE.md`: one project-facts line on sources
- `test/kernel/config.test.mjs`: new, loader cases
- `test/kernel/sources.test.mjs`: new, temp source repo
- `test/kernel/admit.test.mjs`: read only, must stay green

**Changes:**

`config.mjs` per D-001. `.claude/harness.json`:

```json
{ "sources": { "analysis": { "env": "HARNESS_SOURCE_ANALYSIS" } } }
```

No `security_paths` key, so the defaults hold as today.

`sources.mjs` exports `listWorktrees(sourceRoot) -> [{ path, branch, commit, main }]` from `git worktree list --porcelain`, `localBranches(sourceRoot) -> [{ branch, commit, checked_out }]`, `candidates(source, path) -> Candidate[]` (D-005 shape, label = branch name, or the worktree folder name when detached), `find(source, needle)` and `grep(source, regex, { path })`. `find` lists tracked files per worktree (`git ls-files`) and per uncovered branch (`git ls-tree -r --name-only`); `grep` runs `git grep -n -I -e` per worktree and per uncovered branch. Hits with the same path, line and text merge into one entry with every place. Both cap at 200 entries and report `overflow`.

CLI: `harness source find <name> <substring>` and `harness source grep <name> <regex> [--path <prefix>]`. An undeclared name exits 1 listing the declared ones; a source with no root exits 2 with the reason.

Preflight adds one check per source, `source:<name>`: `ok <root> · <n> worktrees`, or `warn unreachable: <reason>`; a config `error` adds `warn config`. SessionStart adds `# Sources` with one line per source: name, root or `unreachable (<reason>)`, and "read-only; use harness source find|grep". It checks existence only and spawns no git process, to stay in the hook budget.

`CLAUDE.md` project facts gain one line: sources are declared in `.claude/harness.json`, their root comes from the env in `settings.local.json`, agents use `harness source find|grep` and the snapshots, and nothing writes under a source.

**Done when:**
- **T-3.1** No file under `.claude/lib/` other than `config.mjs` contains the string `harness.json` (asserted in `config.test.mjs`).
- **T-3.2** With `HARNESS_SOURCE_ANALYSIS` unset, `loadConfig` returns the `analysis` source with `root: null` and a reason naming the variable; a malformed `harness.json` returns the default security paths with `error` set.
- **T-3.3** On a temp source with a main worktree, a linked worktree on `feat-x` and an unchecked-out branch `old`, `harness source find analysis pricing.md` lists `docs/pricing.md` once with the places where it exists.
- **T-3.4** `harness source grep analysis "rate"` merges identical hits across places into one entry, and reports `overflow` past 200 entries.
- **T-3.5** Preflight prints `warn source:analysis` with the reason when the env var is unset and `ok source:analysis` with the worktree count when it points at the temp source.
- **T-3.6** SessionStart context names `analysis` and its root, and the hook cold-start budget test passes.
- **T-3.7** The existing admit and route tests pass unchanged, and `npm test` passes.

## Phase 4: Ticket intake, snapshots and the opening gate

**Touch set:**
- `.claude/lib/sources.mjs`: tokens, resolution, snapshots, `pick`
- `.claude/lib/work.mjs`: `createWork` writes story, runs intake
- `.claude/bin/harness.mjs`: `new --ticket --story`, `source pick`
- `.claude/lib/next.mjs`: `resolve_sources` action
- `.claude/lib/packet.mjs`: render the ambiguous candidates
- `.claude/lib/yaml-lite.mjs`: read only, nesting limit
- `.gitignore`: ignore snapshot bytes
- `.claude/skills/ordering/steps/10-order.md`: fetch story, opening gate
- `.claude/skills/designing/steps/10-design.md`: fetch story, opening gate
- `.claude/skills/ordering/SKILL.md`: step table row
- `.claude/skills/designing/SKILL.md`: step table row
- `test/kernel/sources.test.mjs`: resolution rule cases
- `test/kernel/next.test.mjs`: `resolve_sources` ordering

**Changes:**

`sources.mjs` adds `tokens(text) -> Reference[]` and `intake(id, storyText, root)` applying D-005 and writing D-006. `sources.yaml`:

```yaml
refs:
  - ref: docs/rent/pricing.md
    source: analysis
    path: docs/rent/pricing.md
    status: resolved
    chosen_by: identical
    worktree: D:/analysis
    branch: main
    commit: 9f8e7d6c...
    sha256: 3b1f...
    dirty: false
    snapshot: sources/analysis/docs/rent/pricing.md
  - ref: docs/rent/fees.md
    source: analysis
    path: docs/rent/fees.md
    status: ambiguous
    candidates: [main, feat-fees]
unmatched: [notes/missing.md]
```

`harness new` gains `--ticket <KEY> --story <file>`: the key goes to `state.source`, the file is copied to `story.md` byte for byte, and `intake` runs. Resolution happens before anything is written: a failing pin exits 2 listing every worktree and branch searched and creates no `work/<id>/`. With no source configured, `story.md` is still saved and `sources.yaml` is not written.

`harness source pick <id> <ref> <label>` snapshots the chosen candidate, sets `status: resolved`, `chosen_by: user` and drops `candidates`; an unknown label exits 1 listing the labels.

`next()` returns `{ action: "resolve_sources", actor: "user", detail: "<n> reference(s) differ across worktrees", options: ["[p] pick: harness source pick <id> <ref> <label>"] }` when any ref is ambiguous, checked after the blocked and done branches and before `write_artifact`. `packet.mjs` lists each ambiguous ref with its labels, branches and short commits.

`.gitignore` adds `work/*/sources/`.

Both lane step-1 files: when the request names a Jira key, fetch it with `getJiraIssue`, write the description and acceptance-criteria fields unedited to a file in the session scratchpad, and pass `--ticket <KEY> --story <file>` to `harness new`. When `harness next` says `resolve_sources`, render `harness packet <id>`, stop (the opening gate), apply each reply with `harness source pick`, then spawn the architect with an added `sources: work/<id>/sources.yaml` line. Both SKILL.md step tables gain the `resolve_sources` row.

**Done when:**
- **T-4.1** A story naming `docs/rent/pricing.md`, present only in the main worktree, gives one ref with `chosen_by: single`, and the snapshot bytes equal the worktree file.
- **T-4.2** The same document with CRLF in the main worktree and LF on branch `old` gives `chosen_by: identical` and `worktree` set to the main worktree.
- **T-4.3** Differing versions give `status: ambiguous` with both labels and no snapshot; `harness next` says `resolve_sources` by user; after `harness source pick`, it says `write_artifact` and the ref has `chosen_by: user`.
- **T-4.4** A pin `analysis@old:docs/none.md` makes `harness new` exit 2 listing the places searched, and no `work/<id>/` directory exists afterwards.
- **T-4.5** `and/or` in the story is in neither `refs` nor `unmatched`; `notes/missing.md` is in `unmatched`.
- **T-4.6** A modified, uncommitted worktree copy is recorded with `dirty: true` and the worktree's HEAD as `commit`.
- **T-4.7** `git check-ignore work/x/sources/analysis/a.md` succeeds and `git check-ignore work/x/sources.yaml` fails.
- **T-4.8** `npm test` passes.

## Phase 5: Later references and source drift in the review

**Touch set:**
- `.claude/lib/sources.mjs`: `addRef` and `liveDrift`
- `.claude/bin/harness.mjs`: `source add` verb
- `.claude/lib/review.mjs`: `sources` field in the summary
- `.claude/agents/architect.md`: cite snapshots, OQ on ambiguity
- `test/kernel/sources.test.mjs`: add and drift cases
- `test/kernel/review.test.mjs`: summary `sources` field

**Changes:**

`harness source add <id> <ref>` applies D-005 to one reference: resolved appends to `refs` and writes the snapshot; already present is a no-op; ambiguous exits 2 printing the labels and writes nothing; no match exits 2 listing the places searched.

`liveDrift(id, root) -> [{ ref, snapshot_sha256, live_sha256, moved, reason? }]` recomputes the LF-normalised hash from the recorded worktree file, or from the blob at the recorded branch's current tip when `worktree` is null. A worktree or branch that no longer exists gives `live_sha256: null`, `moved: true` and the reason. `reviewSummary` adds the result as `sources` (`[]` when there is no `sources.yaml`).

`architect.md` Entry adds: read `sources.yaml` and the snapshots it names, cite `sources/<source>/<path>#<heading>:<line>`, use `harness source find|grep` to discover and `harness source add` to bring a document in; an ambiguous result becomes an `OQ-###` with a fallback, never a guess.

**Done when:**
- **T-5.1** `harness source add <id> docs/a.md` for a single-candidate file appends a resolved ref and its snapshot; running it again leaves `sources.yaml` byte-identical.
- **T-5.2** For a path with two differing versions it exits 2, prints both labels, and `sources.yaml` is unchanged.
- **T-5.3** After the recorded worktree file is edited, `review-summary` reports `moved: true` with both hashes; untouched, `moved: false`.
- **T-5.4** After the recorded linked worktree is removed, the ref reports `live_sha256: null`, `moved: true` and a reason.
- **T-5.5** An item without `sources.yaml` gets `sources: []`.
- **T-5.6** `architect.md` names `harness source add` and the OQ rule, and has at most 120 lines; `npm test` passes.

## Phase 6: Write protection on sources and intake files

Security-relevant: this phase changes both guards. It takes its own approval and is never inside a run grant (see OQ-005 for why code does not enforce that yet).

**Touch set:**
- `.claude/hooks/lib/source-paths.mjs`: new, filesystem worktree roots
- `.claude/hooks/guard.scope.mjs`: deny writes under sources, intake files
- `.claude/hooks/guard.bash.mjs`: deny non-safe segments under sources
- `.claude/hooks/lib/project-root.mjs`: read only, Windows path compare
- `.claude/lib/config.mjs`: read only, source roots
- `test/hooks/hooks.test.mjs`: guard cases
- `test/kernel/sources.test.mjs`: filesystem and porcelain agree

**Changes:**

`source-paths.mjs` exports `sourceRoots(projectRoot) -> [{ name, paths: string[] }]`: each configured root, plus every linked worktree read from `<common git dir>/worktrees/*/gitdir` (the common dir found from the root's `.git` directory, or from the `gitdir:` file and its `commondir` when the root is itself a linked worktree). No git process. And `underSource(absPath, roots) -> name|null`, comparing lowercased forward-slash paths on Windows.

`guard.scope` keeps its order: kernel-owned first, now `^work/[^/]+/(state\.yaml|verdicts\.jsonl|phases/|request\.md|story\.md|sources\.yaml|sources/|repos\.yaml)`, then `underSource` on the absolute target, denying with "guard.scope: <path> is inside source <name>, which is read-only; read it through `harness source` and the snapshots".

`guard.bash`: for every segment not classified `safe`, collect the effective cwd, the raw `-C`, `--work-tree` and `--git-dir` values, every string token resolved against that cwd, and the redirect targets; any of them under a source denies with the source name. A safe segment with a write redirect into a source also denies. No source configured, or no root: both guards behave exactly as today.

**Done when:**
- **T-6.1** Write and Edit payloads targeting a file under the source root and under its linked worktree are denied with the source name; a target in the project is not affected.
- **T-6.2** Write payloads targeting `work/<id>/request.md`, `story.md`, `sources.yaml`, `sources/a.md` and `repos.yaml` are denied as kernel-owned.
- **T-6.3** `git -C <worktree> commit -m x`, `cd <worktree> && git add .`, `cp a.md <worktree>/a.md` and `echo x > <worktree>/a.md` are denied.
- **T-6.4** `git -C <worktree> log -1`, `cat <worktree>/docs/a.md` and `grep -rn rate <worktree>` are still allowed.
- **T-6.5** With `HARNESS_SOURCE_ANALYSIS` unset, every existing hook test passes unchanged.
- **T-6.6** `sourceRoots` lists the same paths as `listWorktrees` on a temp repo with two linked worktrees.
- **T-6.7** The hook cold-start budget test and `npm test` pass.

## Open questions

- **OQ-001** Does the spawn tool accept a per-spawn `model: opus` override for a subagent whose file says `sonnet`? Owner: lead, before Phase 2's first live cumulative review. Fallback: spawn `cumulative-reviewer` without the override and name the model actually used in the closing block; raising `reviewer.md` to opus for every scope is a separate user decision.
- **OQ-002** Should the snapshot bytes be committed with the work item? Owner: user. Fallback: ignored by git (Phase 4), with `sources.yaml` and its hashes committed. Committing them is `[IRREVERSIBLE]` once pushed.
- **OQ-003** The analysis repo path on each machine, set as `HARNESS_SOURCE_ANALYSIS` in `settings.local.json`. Owner: user. Fallback: preflight warns, intake saves `story.md` without snapshots, and the review traces the story text alone.
- **OQ-004** Which Jira fields carry the story on this site: the description only, or an acceptance-criteria custom field too? Owner: lead, at the first ticket intake (`getJiraIssue` with `view: full`). Fallback: the description plus every custom field whose name contains "acceptance".
- **OQ-005** Should `.claude/hooks/` join `security_paths` so `route.mjs` `phaseNeedsOwnGate` stops a run grant before a guard phase in code? Owner: user. Fallback: the Phase 6 heading says it takes its own approval and the lead offers no run grant through it; adding the path would also send every future hook edit to the design lane.

## Revision log
- 2026-10-01: D-005 (r2): extract markdown-link targets, strip `#fragment` and `?query`, send unshaped path-like tokens to `unmatched`; anchored and linked paths were dropped without a trace.
- 2026-10-01: D-008 (r2): commands under a source follow their own policy, a strict read-only git list, known writers denied, others prompt; the safe class let tag, reflog, remote mutate.
