---
kind: order
lane: order
title: Kernel accepts tether-prefixed agent names
date: 2026-10-04
audience: developer
sources: [request, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md, .claude/hooks/lib/transcript.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/observe.drive.mjs, .claude/hooks/emit.ledger.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/monitor.context.mjs, .claude/lib/route.mjs, .claude/bin/harness.mjs, test/kernel/route.test.mjs, test/hooks/hooks.test.mjs, test/budgets.test.mjs, bench/schema/ledger-v2.schema.json]
phases:
  - n: 1
    files: [.claude/lib/agent-name.mjs, .claude/lib/route.mjs, .claude/hooks/lib/transcript.mjs, .claude/hooks/observe.drive.mjs, test/kernel/route.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/lib/agent-name.mjs
        pattern: "export function bareAgentName"
      - path: .claude/lib/route.mjs
        pattern: "bareAgentName\\(o\\.agent\\)"
      - path: .claude/hooks/lib/transcript.mjs
        pattern: "bareAgentName\\("
      - path: .claude/hooks/lib/transcript.mjs
        pattern: "\\(\\?::\\[a-z-\\]\\+\\)\\?"
      - path: .claude/hooks/observe.drive.mjs
        pattern: "bareAgentName\\(data\\.agent_type\\)"
      - path: test/kernel/route.test.mjs
        pattern: "tether:developer"
      - path: test/hooks/hooks.test.mjs
        pattern: "tether:developer"
    tests: true
    drive: true
---
# Order: Kernel accepts tether-prefixed agent names

## Problem

Claude Code reports a plugin agent's type with the plugin prefix: the SubagentStart input in the spike named `agent_type: tether:probe` (R-016), and check 8 loaded all four agents as `tether:analyst` and so on (R-020), both in `work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md`. SDR-00001 D-002 says the kernel accepts both forms and strips the prefix in one function every hook uses (TF-001). Today three readers break on the prefixed form. `route()` at `.claude/lib/route.mjs:83` throws `"PHASE DONE" may only come from developer, not tether:developer` whenever no contract heading names the agent. `agentName` at `.claude/hooks/lib/transcript.mjs:108` returns the raw type, so ledger rows and `harness cost` split one role into `developer` and `tether:developer`; its transcript regex at line 114 needs a closing quote straight after `[a-z-]+`, so `"tether:architect"` never matches. `observe.drive.mjs:37` logs the raw type. Hooks must stay under 200 ms cold (`test/budgets.test.mjs:17`).

## Decisions

### D-001: Strip only the exact `tether:` prefix
**Decision:** The function removes `tether:` when, and only when, the string starts with exactly those seven characters, once. `tether:developer` becomes `developer`, `developer` stays `developer`, and `other:developer` stays `other:developer`. Because `route()` compares the result with the token's owner, an agent from another plugin that happens to be called `developer` can never apply `PHASE DONE` to a Tether work item. A non-string or empty input returns `null`, so callers keep their own fallback (`?? null`, `?? "lead"`).
**Instead of:** stripping any `<plugin>:` prefix: another plugin's `developer` agent would pass the owner check and could route Tether verdicts.
**Risks:**
- **RISK-001** The plugin ships under another name (a fork, a renamed `plugin.json`) and every prefixed type stops matching again. Mitigation: the prefix is one constant in one module, and the tests pin `tether:` so a rename fails loudly in `npm test`.

### D-002: The function lives in a new zero-import kernel module
**Decision:** Add `.claude/lib/agent-name.mjs`, exporting `bareAgentName(type)` and nothing that imports anything. `route.mjs` and `hooks/lib/transcript.mjs` both import it. `guard.scope.mjs` and `monitor.context.mjs` import `transcript.mjs`, so they load one extra file of a few lines; `guard.scope.mjs` already loads `../lib/work.mjs`, so hooks reaching into `.claude/lib/` is the existing pattern. Cost: one more file in the kernel.
**Instead of:** putting it in `.claude/lib/route.mjs`: `transcript.mjs` would then pull `route.mjs` and its imports (`work`, `next`, `admit`, `git`, `packet`) into the cold start of `monitor.context.mjs`, which today loads only `transcript.mjs`. Putting it in `hooks/lib/transcript.mjs` lost too, because the kernel's `route()` would import from the hooks folder.

### D-003: `route()` normalises the agent at entry; `route.verdict.mjs` stays unchanged
**Decision:** The first thing `route()` does is replace `o.agent` with `bareAgentName(o.agent)`. The owner check at line 83, the error text and the `verdicts.jsonl` row all see the bare name. This covers both callers with one call: the `route.verdict.mjs` hook, which passes `data.agent_type` through at line 52, and `harness route --agent tether:reviewer`, which a lead following D-002's contract text may type. The hook file therefore needs no edit. What this gives up: a reader of `route.verdict.mjs` sees the raw type passed on and has to know that `route()` strips it.
**Instead of:** wrapping `data.agent_type` at `route.verdict.mjs:52`: the CLI path `harness route --agent tether:developer` would still throw, and the lead's own command would then fail where the hook succeeds.

### D-004: The transcript scan captures one optional prefix segment and strips it through the function
**Decision:** Both patterns in `agentName` become `"agent_type"\s*:\s*"([a-z-]+(?::[a-z-]+)?)"` and the `subagent_type` equivalent, and every value `agentName` returns from `agent_type`, `agent_name` or the scan goes through `bareAgentName`. The regex knows a colon may appear; only the function knows which prefix to drop, so `tether` is written once, in `agent-name.mjs`. A lead transcript holding `"subagent_type":"tether:architect"` now gives `architect`. What this gives up: a foreign type such as `other:developer` is now captured and recorded whole in the ledger, where today the scan skips it.
**Instead of:** `(?:tether:)?[a-z-]+` in the regex: a second copy of the prefix, which a rename would have to find in two places.
**Risks:**
- **RISK-002** A foreign plugin agent's turn shows up in `harness cost` under `other:developer`. Mitigation: the ledger schema types `agent` as a free string (`bench/schema/ledger-v2.schema.json:14`), and a separate row is the truthful attribution; nothing routes on ledger rows.

## Scope
**In:**
- `bareAgentName` in a new kernel module, with unit tests.
- `route()` normalising `o.agent`, so the hook and the CLI accept both forms.
- `agentName` and `observe.drive.mjs` recording the bare name.

**Out:**
- Rewriting contracts, `CLAUDE.md`, skills or kernel messages to the `tether:` form (the rest of D-002 in SDR-00001).
- `emit.ledger.mjs` and `route.verdict.mjs` edits: both get the fix through `agentName` and `route()`.
- Any `<plugin>:` prefix other than `tether:` (D-001).
- The plugin benchmark run (TF-007).

## Phase 1: Strip the tether prefix in one kernel function
**Touch set:**
- `.claude/lib/agent-name.mjs`: new module, `bareAgentName`
- `.claude/lib/route.mjs`: normalise `o.agent` at entry
- `.claude/hooks/lib/transcript.mjs`: `agentName` returns bare names
- `.claude/hooks/observe.drive.mjs`: drive-log row gets bare name
- `test/kernel/route.test.mjs`: function and owner-check tests
- `test/hooks/hooks.test.mjs`: hook tests with prefixed payloads
- `.claude/hooks/route.verdict.mjs`: read only, passes type on
- `.claude/hooks/emit.ledger.mjs`: read only, uses `agentName`

**Changes:** Create `.claude/lib/agent-name.mjs` exporting `bareAgentName(type)`: `string | undefined | null` in, `string | null` out, behaviour fixed by D-001, no imports. In `route.mjs`, import it and normalise `o.agent` before the owner check (D-003); the existing JSDoc above `route()` stays accurate and is left alone. In `transcript.mjs`, import it, widen both scan patterns at line 114 to `([a-z-]+(?::[a-z-]+)?)`, and pass every returned type through it, keeping the `"lead"` and `"subagent"` fallbacks (D-004). In `observe.drive.mjs`, record `agent: bareAgentName(data.agent_type)`, which already returns `null` when the type is missing. No new comments anywhere, JSDoc included. For the drive, pipe a PostToolUse payload with `agent_type: "tether:developer"` into `node .claude/hooks/observe.drive.mjs` and check the appended drive-log row.

**Done when:**
- **T-1.1** `bareAgentName` returns `analyst` for `tether:analyst`, `analyst` for `analyst`, `other:developer` for `other:developer`, `tetherx:developer` unchanged, and `null` for `undefined` and `""`, asserted in `test/kernel/route.test.mjs`.
- **T-1.2** `route({ verdict: "PHASE DONE", agent: "tether:developer", phase: 1 })` writes `phases/1.done`, and the new `verdicts.jsonl` row has `agent: "developer"`.
- **T-1.3** `route({ verdict: "PHASE DONE", agent: "other:developer", phase: 1 })` throws an error matching `/not other:developer/` and writes no marker.
- **T-1.4** `route.verdict.mjs` run on a SubagentStop payload with `agent_type: "tether:developer"`, whose agent transcript opens with `work: <id>\nphase: 1` and ends with `PHASE DONE` under no `## Phase N of` heading, outputs `PHASE DONE applied to <id> phase 1`.
- **T-1.5** `emit.ledger.mjs` writes a row with `agent: "developer"` for a SubagentStop with `agent_type: "tether:developer"`, and a row with `agent: "architect"` for a SubagentStop without `agent_type` whose transcript holds an Agent tool call with `subagent_type: "tether:architect"`.
- **T-1.6** `observe.drive.mjs` run with `agent_type: "tether:developer"` appends a `drive-log.jsonl` row with `agent: "developer"`.
- **T-1.7** `npm test` passes, including `hooks start cold under the budget` in `test/budgets.test.mjs`.

## Open questions
none

## Revision log
