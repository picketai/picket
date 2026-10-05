# Hooks

Wired in `.claude/settings.json`. `guard.*` deny or bounce, `lint.*` and `monitor.*` feed text back, `observe.*` and `emit.*` record, `inject.*` add context. Every hook exits 0 on its own failure except where a deny is the point; a hook must start in under 200 ms cold (`test/budgets.test.mjs`).

| Hook | Event | Does |
|---|---|---|
| `inject.state.mjs` | SessionStart | open work items with their next action, plus `.claude/MEMORY.md` |
| `guard.scope.mjs` | PreToolUse Write, Edit | denies writes to kernel-owned files (`work/*/state.yaml`, `phases/`, `verdicts.jsonl`, `comments.jsonl`, `.claude/ledger/`); denies an Edit on a file this transcript never read |
| `guard.comments.mjs` | PreToolUse Write, Edit | denies an edit that adds a comment line to a code file (detector in `lib/comments.mjs`, doc comments included), unless `harness comment` recorded the user's approval for that path and text on an open or blocked item |
| `guard.bash.mjs` | PreToolUse Bash | the command evaluator kept from the previous harness: read-only commands allowed, destructive roots denied, compound and redirected commands prompt |
| `lint.schema.mjs` | PostToolUse Write, Edit under `work/` | order and design artifacts: frontmatter, phase headings, decision ids, caps, placeholders, revision protocol against git HEAD |
| `observe.drive.mjs` | PostToolUse Bash | appends drive or inspect rows to `.claude/ledger/drive-log.jsonl` with the open work item and phase; `harness verify` reads them |
| `monitor.context.mjs` | PostToolUse Read, Grep, Glob, WebFetch, WebSearch | the stall detector: six look-around calls with no action get one line of context |
| `guard.block.mjs` | Stop, SubagentStop | a turn with a contract heading must end with an exact verdict token and stay within 40 lines |
| `route.verdict.mjs` | Stop, SubagentStop | applies the verdict to the work item with the kernel and hands back `harness next` as context |
| `emit.ledger.mjs` | Stop, SubagentStop | one v2 ledger row per turn (`bench/schema/ledger-v2.schema.json`) |

Libraries: `lib/transcript.mjs` (tail reads, spawn hints, tool statistics, read-before-edit lookup), `lib/turn-block.mjs` and `lib/drive-evidence.mjs` (kept from the previous harness for their tested parsers), `vendor/shell-quote-parse.mjs` (for `guard.bash`).

Standalone: `node .claude/hooks/<hook>.mjs < payload.json`. Tests: `test/hooks/`.

A blocked call or a bounced turn is the harness working. Fix the violation; do not retry variants.
