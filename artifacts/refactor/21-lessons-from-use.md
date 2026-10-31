# 21: Lessons from a consumer project's agent memory

Status: approved (2026-10-31).

Implements every outcome approved in `artifacts/reports/picket-candidates-from-development-memory-2026-10-30.md` (`## Walkthrough outcomes`, items 1 to 18 and K1 to K4). The exact text of each instruction change lives there, once; this draft cites it by item and adds only the code shape, the split and the risks. Nothing from the consumer project goes into the change: examples stay neutral (orders, a shop, `src/Webapp`), and `test/repo/private-terms.test.mjs` checks it.

## Today

| Fact | Value |
|---|---|
| Absence claims | `src/agents/analyst.md:31` sets the markers; nothing asks for every path to be followed before `[VERIFIED]` on a claim of absence (items 1, 2) |
| Blocked drives | `src/skills/implementing/SKILL.md:60` allows `blocked: <what>` with no kind; `guard.block`'s `proofProblems` (`src/lib/hooks/guard/block/index.mts:36`) does not look at it (item 3) |
| Premises and figures | `src/agents/architect.md:71` covers schema, data, legacy behaviour and third-party contracts, not examples, figures or a ticket's diagnosis; line 37 repeats it (items 4, 5, 18) |
| Deferred criteria | `alignment.md` grades PASS, FAIL or UNCLEAR only; `picket close` prints no criterion; a criterion nobody can run here ends as FAIL or as an unearned PASS (item 6) |
| Amendments | `architect.md:77` loads only what the finding names; nothing rebuilds an incomplete table or sweeps for a retired name (item 7) |
| Negative greps | A grep entry is `path`, `pattern`, `flags`; 176 whole-file lookaheads in this repository's records, 173 with `flags: i` as a workaround, since `^(?![\s\S]*X)` passes under the default `m` with X present (item 8) |
| Overwrites | `guard.scope`'s `editsUnreadFile` (`src/lib/hooks/guard/scope/index.mts:52`) covers Edit, not Write (item 13) |
| Wrapped deletes | `guard.bash` denies `rm` and `git clean`; `cmd //c del`, `cmd.exe /c erase`, `pwsh -Command Remove-Item` (Bash tool) and `cmd /c del` (PowerShell tool) get no decision, probed 2026-10-31 (K1) |
| Nested checkouts | `picket verify` runs each checkout's tests (`checkoutTests`, K2 done); `picket check` and `picket drive` run at `projectRoot()`, the umbrella (K3) |
| Quotations | `src/rules/prose.md` has no exemption for quoted text, so the dash rule reaches a quoted criterion or a shipped string (K4) |
| Budgets | architect 103 of 120 lines, developer 73, analyst 72, `implementing/SKILL.md` 73 of 150, `reviewing/SKILL.md` 67, `tests` and `prose` rules 13 of 60 |

## Target

### Instructions (prose only)

Items 1, 2, 4, 5, 7, 9, 10, 11, 12, 14, 15, 16, 17, 18 and K4, plus the prose halves of 3, 6, 8 and K1, each with the text and the place its outcome gives. After them: architect about 106 lines, developer 75, analyst 74, implementing about 78; every budget holds.

### Blocked drives (item 3)

`proofProblems` reads the `Verified:` line of a developer `PHASE DONE` block: `blocked:` must be followed by `data`, `configuration` or `environment`, a colon and text, else the bounce message of the outcome. The fast lane's `## Expedited:` block stays unchecked. Tests: each kind passes, the bare form bounces, the two other `Verified:` forms pass.

### Deferred criteria (item 6)

`deferredCriteria(body)` in `src/lib/shared/work/artifact.mts`, beside `strategicReviewIds`, returns `{ id, owner, gate }` for each `- **T-N.x** [DEFERRED: <owner>, <gate>]` line. `Closing` in `src/lib/verbs/close/close.mts` gains `deferred`, filled for the order and design lanes; `block.mts` prints `Deferred: <id> <owner>, <gate>` after `Questions:`. `lint.schema` flags a criterion holding `[DEFERRED` without both parts. The marker sits after the id, so the criteria count in `capProblems` is unchanged.

### Negative greps (item 8)

A grep entry gains `absent: true`. `grepResults` in `src/lib/verbs/verify/index.mts` passes it when the file is missing or the pattern does not match. `grepProblems` in `lint.schema` flags a non-boolean `absent` and a pattern starting `^(?!`. The order and design templates show the field as optional; `src/rules/work-items.md` names it among the must_haves if it lists the grep fields.

### Guards (item 13, K1)

`editsUnreadFile` also returns true for a Write whose target exists and was not read in the session. `guard.bash` classifies a delete wrapped in `cmd`, `cmd.exe`, `powershell` or `pwsh` as destructive, with the same denial as `rm`; only the delete verbs match (`del`, `erase`, `rd`, `rmdir`, `Remove-Item` and its aliases), so `cmd //c mklink` and other wrapped commands keep their current class.

### Check and drive in a nested checkout (K3)

When the working directory sits in a nested repository or worktree under the project root, `picket check` and `picket drive` detect tooling in that checkout's git top level and run there, as `checkoutTests` does with `cwd`; logs, state and the drive log stay at the project root. Tests on a two-checkout fixture: the nested checkout's command runs, the umbrella's does not, and a nested checkout with no tooling reports none.

## Decisions

- **D-1 One copy of the text.** The report's outcomes hold every instruction's exact wording; the design record cites them by item instead of restating them.
- **D-2 Code where code can decide.** Blocked kinds, deferrals at close, malformed markers, negative greps, unread overwrites and wrapped deletes are checked by the kernel and the hooks; the prose names the format and leaves the checking to them.
- **D-3 Old records stay as they are.** `lint.schema` runs on the record being written, so closed items keep their lookahead greps and no record is migrated.
- **D-4 No new delete verb.** `PICKET_ESCALATE` alone and `picket leave` already cover a deliberate delete; the change closes the bypass only.
- **D-5 The checkout comes from the working directory.** `check` and `drive` take no new flag; the same rule `verify` uses for a touched checkout applies to where they are called.

## Migration

The architect sets the phases; a likely split:

1. The instruction text, every prose item.
2. Blocked kinds in `guard.block` (item 3).
3. Deferrals: parser, close, closing block, `lint.schema`, the two lane templates (item 6).
4. `absent` greps: verify, `lint.schema`, templates (item 8).
5. The two guards (item 13, K1).
6. `check` and `drive` in a nested checkout (K3).

After the cumulative review, offer the fast lane bench (items 3, 6, 8 and K1 change contracts) with its worst case, and run it only on the user's answer and cap.

## Risks

- An architect could defer a hard criterion to get past it. The reviewer grades DEFERRED only where the plan marks it, and every deferral reaches the user in the closing block.
- The Write rule could stop an agent writing a generated file it never read. Reading first costs one call, and the host's Write already refuses an unread overwrite in current versions; the hook keeps that true on any version.
- Items 14 to 18 rest on the report's one-line summaries; their sources were deleted with the consumer project's untracked memory.
- `guard.bash` is the guard every Bash call passes; a wrong match denies a safe command. Each wrapped form gets a deny test and each non-delete wrapped command an unchanged-class test.

## Affects

`src/agents/{analyst,architect,developer}.md`; `src/skills/implementing/SKILL.md`, `src/skills/reviewing/SKILL.md`, `src/skills/reviewing/checklists/{alignment,crosscheck}.md`, `src/skills/resuming/SKILL.md`, `src/skills/ticketing/steps/jira.md`, `src/skills/{ordering,designing}/SKILL.md`, `src/skills/documenting/templates/{order,design}.md`; `src/rules/{prose,tests}.md` and possibly `work-items.md`; `src/lib/hooks/guard/{block,scope,bash}/`, `src/lib/hooks/lint/schema/index.mts`, `src/lib/shared/work/artifact.mts`, `src/lib/verbs/close/{close,block}.mts`, `src/lib/verbs/verify/index.mts`, `src/lib/verbs/{check,drive}/index.mts`; their tests.
