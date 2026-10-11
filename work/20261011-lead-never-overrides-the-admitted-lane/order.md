---
kind: order
lane: order
title: Lead never overrides the admitted lane
date: 2026-10-11
audience: developer
sources: [work/20261011-lead-never-overrides-the-admitted-lane/request.md, core/lib/admit.mjs, test/kernel/admit.test.mjs, core/templates/claude-block.md, CLAUDE.md, test/budgets.test.mjs, test/kernel/init.test.mjs, core/lib/verify.mjs]
phases:
  - n: 1
    files: [core/lib/admit.mjs, test/kernel/admit.test.mjs]
    greps:
      - path: core/lib/admit.mjs
        pattern: 'no small-change word and no file named; order is the default'
      - path: core/lib/admit.mjs
        pattern: '^(?![\s\S]*not plainly small)'
        flags: i
      - path: test/kernel/admit.test.mjs
        pattern: 'remove the broken hooks'
        flags: i
      - path: test/kernel/admit.test.mjs
        pattern: '\.claude/settings\.json'
    tests: true
    drive: true
  - n: 2
    files: [core/templates/claude-block.md, CLAUDE.md]
    greps:
      - path: core/templates/claude-block.md
        pattern: 'Never load a second lane skill to compare\. The lane is admit.s call. a change that looks too small for it still takes it; only the user overrides it\.'
      - path: CLAUDE.md
        pattern: 'Never load a second lane skill to compare\. The lane is admit.s call. a change that looks too small for it still takes it; only the user overrides it\.'
      - path: CLAUDE.md
        pattern: '^(?![\s\S]*One-liners every agent needs)'
    tests: true
    drive: false
---
# Order: Lead never overrides the admitted lane

## Problem

On a first prompt the lead skipped the lane `picket admit` chose. Admit answered order for deleting three keys from a JSON file; the lead found order too heavy, read the fallback reason "not plainly small and not a heavy-lane trigger" (`core/lib/admit.mjs:114`) as a sign of a borderline call, and edited directly. Three kernel gaps fed that: the fallback reason reads like a judgement, `SMALL_CHANGE` (`core/lib/admit.mjs:26`) has no remove or delete wording, and `mentionedPaths` (`core/lib/admit.mjs:32`) misses an unbackticked `.claude/settings.json` because its bare-path alternative needs a `src|test|tests|data|scripts|lib|app` prefix. The block in `core/templates/claude-block.md` also never says the lane binds. `CLAUDE.md` must start with that block verbatim (`test/kernel/init.test.mjs:131`) and is 2043 bytes against a 2048 budget (`test/budgets.test.mjs:14`), so the new sentence needs bytes freed in the same file.

## Decisions

### D-001: The binding sentence goes into step 1 of the shipped block; bytes come from repo-only lines
**Decision:** Step 1 of `core/templates/claude-block.md` gains one sentence right after "Never load a second lane skill to compare.": `The lane is admit's call: a change that looks too small for it still takes it; only the user overrides it.` (107 bytes with its leading space). `CLAUDE.md` gets the same sentence at the same place, since it must start with the template. The bytes come from the repository-only part of `CLAUDE.md`, below the block: the line "One-liners every agent needs and none should rediscover." goes (init writes only the `## Project facts` heading, `test/kernel/init.test.mjs:42`), the Sources fact is tightened, and "Start every session with" becomes "Start sessions with". Measured with these exact texts, `CLAUDE.md` lands at 2043 bytes, the same 5 bytes of headroom as today. It gives up two pieces of wording in the repo-only text ("the work item's snapshots" and "each root comes from its env var, set in the `env` block of"), with no fact lost.
**Instead of:** Raising `claude_md_bytes` in `test/budgets.test.mjs`: the budget exists to stop the always-on file from growing, and the lead's notes require bytes freed in the same file.
**Risks:**
- **RISK-001** `CLAUDE.md` is LF on disk (`git ls-files --eol` shows `w/lf`) and `statSync` counts bytes, so saving it with CRLF adds about 20 bytes and fails the budget. Mitigation: keep LF; the budget test in `npm test` catches it.

### D-002: The fallback reason states the fact that decided the lane
**Decision:** `core/lib/admit.mjs:114` pushes `no small-change word and no file named; order is the default`. The fallback is reached only when `fastOk` is false and no order reason was pushed, which means `small_change` is false and `fileCount` is 0, so the text is always true where it appears.
**Instead of:** Listing every signal that came back false: longer output, and the two facts above are the only ones that can be false at that line.

### D-003: Removing a key, line, entry, setting or hook is a small change
**Decision:** `SMALL_CHANGE` gains one alternative: a remove or delete verb in any form (`remove`, `removes`, `removing`, `delete`, `deletes`, `deleting`), then zero to three words, then `key`, `line`, `entry`, `entries`, `setting` or `hook`, singular or plural. Example: "remove the broken hooks" and "deleting three keys from a JSON file" match; "remove the billing module" and "remove the two stale broken hooks" (four words between) do not. Extending the one regex keeps both readers in step: the `small_change` signal (`core/lib/admit.mjs:84`) and the research exclusion (`core/lib/admit.mjs:76`). Heavy-lane checks still run first, so "delete the records" stays in design through `IRREVERSIBLE`.
**Instead of:** Adding bare `remove|delete` to the small words: "remove the invoice feature" would then land in fast.
**Risks:**
- **RISK-002** A large removal phrased with a listed noun ("remove the hook system") lands in fast. Mitigation: `recheck` escalates once the touch set passes the fast cap of 3 files (`core/lib/config.mjs:16`).

### D-004: Detect unbackticked paths that start with a dot directory
**Decision:** `mentionedPaths` gains a third alternative for a bare path whose first segment starts with a dot and which has at least one slash, such as `.claude/settings.json` or `.github/workflows/ci.yml`. It must not start right after a word character, slash, dot or hyphen (so `core/.claude/x.json` does not yield `.claude/x.json`), and it must not end in punctuation (so "edit .claude/settings.json." yields `.claude/settings.json`). The existing existence check still filters every match. A lookbehind such as `(?<![\w/.-])` and a final character class without `.` meet both rules; the developer picks the exact regex.
**Instead of:** Matching any unbackticked path with a slash and an extension (for example `core/lib/admit.mjs`): it changes the lane of every request in this repo that names a `core/` path, which the request did not ask for.

## Scope

**In:** the fallback reason, the removal signal and dot-directory paths in `core/lib/admit.mjs` with tests; the binding sentence in the template and `CLAUDE.md`.
**Out:** changes to lane skills, `recheck`, the `lane: <name>` override at `core/lib/admit.mjs:66`, bare root dotfiles such as `.gitignore`, and the budget value.

## Phase 1: Admission signals and fallback reason
**Touch set:**
- `core/lib/admit.mjs`: reason, regex, path detection
- `test/kernel/admit.test.mjs`: new admission tests
- `core/lib/config.mjs`: fast cap is 3, read only
**Changes:** Per D-002, replace the fallback reason string. Per D-003, add the removal alternative to `SMALL_CHANGE`. Per D-004, add the dot-directory alternative to the regex in `mentionedPaths`, and make the `.replace(/:\d+(:\d+)?$/, "")` line read the new capture group too. In the test file, add `.claude/settings.json` to the list `repo()` writes, and add tests for the criteria below. Existing tests stay unchanged.
**Done when:**
- **T-1.1** `admit("Improve the invoice list page", { root })` returns lane `order` with `reasons` deep-equal to `["no small-change word and no file named; order is the default"]`, and no file under `core/` contains "not plainly small".
- **T-1.2** "Remove the broken hooks" and "Delete three keys from the JSON file" land in `fast` with `signals.small_change` true; "Fix or remove the broken hooks" still lands in `fast`.
- **T-1.3** "Remove the billing module" lands in `order`, and "Delete the records older than a year" lands in `design`.
- **T-1.4** `mentionedPaths("Edit .claude/settings.json.", root)` returns `[".claude/settings.json"]`; `.claude/nope.json` returns `[]`; `core/.claude/settings.json` (not on disk) returns `[]`.
- **T-1.5** `admit("Drop the stale keys from .claude/settings.json", { root })` lands in `fast` with `.claude/settings.json` in `signals.mentioned_paths`.
- **T-1.6** `npm test` passes.
- **T-1.7** Driving `picket admit --request - --human` with "Remove the broken hooks in .claude/settings.json" in this repo prints the fast lane.

## Phase 2: Binding sentence in the block
**Touch set:**
- `core/templates/claude-block.md`: add the binding sentence
- `CLAUDE.md`: mirror sentence, free bytes
- `test/budgets.test.mjs`: 2048-byte budget, read only
- `test/kernel/init.test.mjs`: block prefix check, read only
**Changes:** Per D-001, in both files insert ` The lane is admit's call: a change that looks too small for it still takes it; only the user overrides it.` right after `Never load a second lane skill to compare.` in step 1. In `CLAUDE.md` only, below the block:
- Delete the line `One-liners every agent needs and none should rediscover.` and the blank line after it.
- Replace the Sources fact with exactly: ``- Sources (read-only repos such as `analysis`) are declared in `.picket/config.json`, each root an `env` entry in `.claude/settings.local.json`. Reach them with `picket source find|grep` or work item snapshots; nothing writes under one.``
- Change `Start every session with` to `Start sessions with`.
Keep `CLAUDE.md` LF and the template's line endings as they are.
**Done when:**
- **T-2.1** Step 1 of `core/templates/claude-block.md` holds the sentence directly after "Never load a second lane skill to compare."
- **T-2.2** `CLAUDE.md` starts with the template text (the init test at `test/kernel/init.test.mjs:131` passes).
- **T-2.3** `CLAUDE.md` is at most 2048 bytes on disk (2043 expected).
- **T-2.4** `CLAUDE.md` no longer contains "One-liners every agent needs" and contains "Start sessions with".
- **T-2.5** `npm test` passes.

## Open questions

none

## Revision log
