---
kind: order
lane: order
title: Comments rule precedence and drive paths
date: 2026-10-02
audience: developer
sources: [request, .claude/rules/comments.md, .claude/lib/drive.mjs, test/kernel/drive.test.mjs, .claude/hooks/guard.comments.mjs, .claude/lib/comments.mjs, .claude/hooks/guard.scope.mjs, .claude/bin/harness.mjs, .claude/agents/developer.md, .claude/skills/ordering/steps/30-gate.md]
phases:
  - n: 1
    files: [.claude/rules/comments.md, .claude/lib/drive.mjs, test/kernel/drive.test.mjs]
    greps:
      - path: .claude/rules/comments.md
        pattern: "project rule"
      - path: .claude/lib/drive.mjs
        pattern: "status --porcelain -z"
      - path: .claude/lib/drive.mjs
        pattern: "ls-files -z --others"
      - path: test/kernel/drive.test.mjs
        pattern: "café"
    tests: true
    drive: true
---
# Order: Comments rule precedence and drive paths

## Problem

Three follow-ups to `20261002-near-zero-comments-ask-before-adding-one`. A target project's language rule (its `csharp.md` `## Comments` section) still allows one-line comments without asking, and `.claude/rules/comments.md` does not say which rule wins. `.claude/lib/drive.mjs:90` and `:94` read `git status --porcelain` and `git ls-files --others` as plain lines, so with git's default `core.quotePath` a non-ASCII path arrives as `"caf\303\251.log"`: `removeFiles` calls `rmSync` with `force: true` on a path that does not exist, nothing throws, and the file is reported removed while it stays. Two header comments in this repo went stale with the last order. Because they are comments, they can only reach the user as proposals at the gate.

## Decisions

### D-001: The harness rule states that it wins, and target project rules stay untouched
**Decision:** One sentence goes into `.claude/rules/comments.md`, right after "Always loaded.": the rule wins over any project rule, such as a language rule's `## Comments` section, that allows comments or doc comments. This answers the user's question with no edit in the target project. The rule loads in every session, so the sentence reaches every agent that also reads `csharp.md`, and `guard.comments` enforces the ban whatever the project rule says.
**Instead of:** editing each target project's language rule files too. The harness cannot write into a target project's own rules from this repo, and a second copy of the policy in every project drifts from the one the hook enforces.

### D-002: Both git listings read NUL-separated output
**Decision:** `modifiedTracked` runs `git status --porcelain -z --untracked-files=no` and `untrackedUnignored` runs `git ls-files -z --others --exclude-standard`. Both split on `\0`, not on newlines. With `-z`, git never quotes or escapes a path, so the existing wrapper-quote strip on line 90 goes away. `gitLines` gains a separator parameter, or a sibling `gitEntries` splits on `\0`; the developer picks. In `-z` status output, a rename or copy entry (`R` or `C` in the first two columns) is followed by its source path as a separate entry. That source path is skipped, so only the current path is kept.
**Instead of:** `git -c core.quotePath=false`. It only stops octal escaping of non-ASCII bytes. Porcelain still wraps and C-escapes a path that holds a double quote, a backslash or a control character, so the strip-and-hope parse would stay.
**Risks:**
- **RISK-001** `checkout` on line 104 still joins paths into a shell string inside double quotes, so a path that contains `"` breaks the restore. Mitigation: out of scope here. It fails loudly (`checkout` returns `[]`, so `restored` is empty), never silently.

### D-003: The two stale header comments are proposals, not edits
**Decision:** `.claude/bin/harness.mjs` and `.claude/hooks/guard.scope.mjs` are read, not edited, and are not in the phase's `files`. The developer puts both header changes on its block's `Comments:` line, so the gate packet shows them with `[k] keep comment <n>`. This is the first real use of the ask path from Phase 3 of the last order. Each proposal changes exactly one comment line, and its text is that line's full new comment body, because `guard.comments` matches an approval against the whole normalised body (`normalise` in `.claude/lib/comments.mjs:78`). A kept proposal comes back as `comment approved: …`. The developer then writes exactly that line, re-stages and re-emits, as `.claude/agents/developer.md` says. An `a` reply with proposals pending drops them, and both headers stay as they are.
**Instead of:** putting both files in the touch set and editing the headers. `guard.comments` would deny the edit, and the rule says a comment is never written without the user's approval.

## Scope

**In:**
- The precedence sentence in `.claude/rules/comments.md`
- NUL-separated git listings in `.claude/lib/drive.mjs`, with a non-ASCII regression test
- Two header-comment proposals on the block's `Comments:` line

**Out:**
- Editing any target project's rule files (D-001)
- Shell quoting in `checkout` (RISK-001)
- Writing either header comment without a `k` reply

## Phase 1: Precedence sentence, drive paths, and two proposals

**Touch set:**
- `.claude/rules/comments.md`: add the precedence sentence
- `.claude/lib/drive.mjs`: NUL-separated status and ls-files
- `test/kernel/drive.test.mjs`: non-ASCII restore and remove test
- `.claude/bin/harness.mjs`: proposal target, not edited
- `.claude/hooks/guard.scope.mjs`: proposal target, not edited

**Changes:** In `.claude/rules/comments.md` add one sentence after line 3, in the file's plain style: the rule wins over any project rule, such as a language rule's `## Comments` section, that allows comments or doc comments.

In `.claude/lib/drive.mjs` change the two listings per D-002, delete the `.replace(/^"(.*)"$/, "$1")` strip, and skip the source path of rename and copy entries. Add no comments.

In `test/kernel/drive.test.mjs` add a test on the pattern of "drive restores tracked files its own requests changed and removes files it created" (line 99). Commit a tracked `données.json`, and have the server write it and create `café.log`. Assert `restored` is `["données.json"]` and `removed` is `["café.log"]`, that the tracked file holds its committed content again, and that `café.log` no longer exists. Build the server source from single-line strings, as the existing test does.

The block's `Comments:` line carries two proposals:
- `.claude/bin/harness.mjs:<line>`: a new usage line `harness comment <id> --path <p> --text "<t>"`, placed in the header next to the other per-item verbs and aligned like its neighbours.
- `.claude/hooks/guard.scope.mjs:<line>`: one header line of rule 1 that also names `work/<id>/comments.jsonl` (line 5, after `repos.yaml)`, is the natural place), quoted as that line's full new text.

**Done when:**
- **T-1.1** `.claude/rules/comments.md` has one sentence saying it wins over a project or language rule that allows comments or doc comments, and `test/budgets.test.mjs` passes (rule at most 60 lines).
- **T-1.2** `.claude/lib/drive.mjs` runs `git status --porcelain -z` and `git ls-files -z --others`, splits both on `\0`, and holds no `replace(/^"(.*)"$/` strip.
- **T-1.3** The new drive test passes. A drive that rewrites tracked `données.json` and creates `café.log` reports `restored: ["données.json"]` and `removed: ["café.log"]`, and afterwards the tracked file holds its committed content and `café.log` does not exist.
- **T-1.4** Drive in this repo: `harness drive --run` with a command that creates `tmp-é.txt` prints that name under `removed`, and `tmp-é.txt` does not exist afterwards.
- **T-1.5** The block's `Comments:` line holds exactly two proposals. One is for `.claude/bin/harness.mjs`, and its text is the full usage line for `harness comment`. The other is for `.claude/hooks/guard.scope.mjs`, and its text is the full new header line naming `work/<id>/comments.jsonl`. Each changes exactly one comment line.
- **T-1.6** At `PHASE DONE`, `git diff --cached --name-only` lists no path outside the three files in this phase's `files` and `work/20261002-comments-rule-precedence-and-drive-paths/`. `harness.mjs` and `guard.scope.mjs` appear only after a `k` reply.
- **T-1.7** `npm test` passes.

## Open questions

none

## Revision log
