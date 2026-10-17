---
kind: design
lane: design
title: Auto mode joins the asking modes
date: 2026-10-17
audience: developer
sources: [request.md, core/lib/escalation.mjs, core/lib/hooks/guard.bash.mjs, test/hooks/handlers.test.mjs, bench/results/ask-probe.json, bench/probe-ask.mjs, bench/test/probe-ask.test.mjs, core/lib/hooks/guard.scope.mjs, core/bin/picket.mjs, work/20261016-guard-escalation-through-native-ask-dialog/design.md, work/20261017-guard-and-probe-cover-powershell-commands/order.md]
phases:
  - n: 1
    files: [core/lib/escalation.mjs, test/hooks/handlers.test.mjs, work/20261016-guard-escalation-through-native-ask-dialog/design.md]
    greps:
      - path: core/lib/escalation.mjs
        pattern: 'ASKING_MODES = new Set\(\["default", "acceptEdits", "auto"\]\)'
      - path: test/hooks/handlers.test.mjs
        pattern: '\["acceptEdits", "auto", "default"\]'
      - path: work/20261016-guard-escalation-through-native-ask-dialog/design.md
        pattern: '### D-003 \(r3\): Ask only where the dialog is proven'
      - path: work/20261016-guard-escalation-through-native-ask-dialog/design.md
        pattern: '- 2026-10-17: D-003 \(r3\): '
    tests: true
    drive: true
    security: true
---
# Design: Auto mode joins the asking modes

## Problem

An escalation (`PICKET_ESCALATE="<why>" <command>`) in auto permission mode denies today with `why: "mode"`, because `ASKING_MODES` (`core/lib/escalation.mjs:6`) holds only `default` and `acceptEdits`. D-003 (r2) of `20261016-guard-escalation-through-native-ask-dialog` left auto out on an interactive record of `auto_dialog: "silent"`, and work item `20261017-guard-and-probe-cover-powershell-commands` showed that record was invalid: the probe hook matched only Bash while the interactive session ran PowerShell, so the hook never ran. The re-run, committed in 9a4f317 at 2026-10-17 21:30, records `interactive: { auto_dialog: "shown", bang_hooked: false, tool: "PowerShell" }` in `bench/results/ask-probe.json`, and the user saw the dialog themselves at 21:28. The binding constraints stay as D-003 set them: deny is the default, the marker never yields `allow`, no approval carries over, every judged escalation writes one ledger row, and `bypassPermissions` and `dontAsk` keep denying with `why: "mode"`.

## Decisions

### D-001: Auto joins the asking modes, tied to the probe record

**Decision:** `ASKING_MODES` becomes `new Set(["default", "acceptEdits", "auto"])`. The guard's mode check (`escalationVerdict`, `core/lib/hooks/guard.bash.mjs:1122`) and its saved-rule and `refused_before` checks after it stay as they are, so an auto-mode escalation goes through the same saved-rule and refusal checks as `default` before it gets `ask`. The set stays a hand-copied constant, as D-008 of the earlier item requires (the record is never read at runtime). The test binds the two: it asserts the set is exactly `acceptEdits`, `auto`, `default`; that each member has a headless `ask` cell that called the prompt tool with no error; and that `record.interactive.auto_dialog` is `"shown"` because `auto` is in the set. A later probe run that records `silent` therefore fails `npm test` until an amendment takes `auto` out again. Infrastructural decision.
**Instead of:** reading `ask-probe.json` at hook time to build the set: it puts a bench file on the hook's cold path and lets a re-run of a bench script change security behaviour with no review.
**Risks:**
- **RISK-001** Auto mode adds a model-side classifier, and a future Claude Code release could stop showing the dialog for a hook `ask` there, so the command runs with no human answer. Mitigation: the hook `ask` reason states the command and the reason, the ledger keeps the `ask` row, and re-running `node bench/probe-ask.mjs --interactive` after a Claude Code upgrade is the check; a `silent` answer fails the test above.

### D-002: One mode set for both shell tools; Bash needs no separate interactive record

**Decision:** `ASKING_MODES` stays keyed by mode only, and `auto` applies to the Bash and the PowerShell tool alike. The Bash side rests on the evidence that admitted `acceptEdits`: the headless `auto` `ask` cell in `bench/results/ask-probe.json` ran when the probe hook matched only Bash (it recorded `hook_permission_mode: "auto"`, so the hook ran on a Bash call) and it called the prompt tool. The interactive record adds the PowerShell side. A hook `ask` reaches Claude Code's permission flow as a hook decision, not as tool logic, so nothing in the evidence points to a tool-specific dialog. Infrastructural decision.
**Instead of:** a per-tool shape, `{ Bash: [...], PowerShell: [...] }`, with `auto` for PowerShell only until a Bash interactive run: it changes the constant's data shape, its test and both callers in `guard.bash.mjs` (`:1122`, `:1154`) to guard a difference no record shows, and it keeps escalation off for Bash subagents in the user's usual mode.
**Risks:**
- **RISK-002** Interactive auto mode handles a Bash hook `ask` differently from PowerShell. Mitigation: OQ-001 asks for one interactive run that forces the Bash tool; a `silent` answer goes back through an amendment of this decision to the per-tool shape.

### D-003: Amend D-003 of the earlier item in place, leave its approved phase 6 alone

**Decision:** The phase edits `work/20261016-guard-escalation-through-native-ask-dialog/design.md`: the heading becomes `### D-003 (r3): Ask only where the dialog is proven`; its body states the set `{"default", "acceptEdits", "auto"}`, that the earlier `silent` record was invalid because the hook never ran on the PowerShell call, that the re-run recorded `shown` for PowerShell (9a4f317), and that `bypassPermissions` and `dontAsk` stay out by the user's ruling of 2026-10-17; RISK-005 keeps its ID and is reworded to D-001's RISK-001 above, since "auto mode proved silent" is no longer true; OQ-001's answer sentence names the re-run; and one line goes to its `## Revision log`. Phase 6 of that item, its `T-6.x` criteria and its frontmatter `greps` stay as approved history. Infrastructural decision.
**Instead of:** editing phase 6 and its grep to the new set: approved phases are never touched, and this item's own phase and must_haves carry the change.
**Risks:**
- **RISK-003** `picket verify 20261016-guard-escalation-through-native-ask-dialog 6` now fails its `ASKING_MODES` grep. Mitigation: only the CLI calls `verify` (`core/bin/picket.mjs:24` is its one importer), the item is done, and its revision log points to this item.

## Scope

**In:**
- `ASKING_MODES` gains `auto` (D-001, D-002)
- the four tests in `test/hooks/handlers.test.mjs` that name auto as a deny mode
- the D-003 (r3) amendment, RISK-005, OQ-001 answer and revision log line of the earlier item (D-003)

**Out:**
- `bypassPermissions`, `dontAsk` and `plan`: they keep denying with `why: "mode"`
- the mode deny reason text in `guard.bash.mjs`, which stays correct for the remaining modes
- the probe script and its record; a Bash interactive run (OQ-001)
- phase 6 of the earlier item and its must_haves

## Phase 1: Auto asks for a marked command

**Touch set:**
- `core/lib/escalation.mjs`: `ASKING_MODES` (`:6`)
- `test/hooks/handlers.test.mjs`: set test (`:668`), mode loop (`:678`), unlisted-mode test (`:714`), PowerShell mode test (`:856`)
- `work/20261016-guard-escalation-through-native-ask-dialog/design.md`: D-003 (`:109` to `:116`), OQ-001 (`:330`), revision log (`:338`)
- `bench/results/ask-probe.json`: read; `cells` and `interactive`
- `core/lib/hooks/guard.bash.mjs`: read; `escalationVerdict` (`:1119`), unchanged

**Changes:**
- `ASKING_MODES` becomes `new Set(["default", "acceptEdits", "auto"])`.
- Set test (`:668`): new title naming auto; asserts `[...ASKING_MODES].sort()` equals `["acceptEdits", "auto", "default"]`, keeps the per-member headless cell loop, and asserts `record.interactive.auto_dialog === "shown"` unconditionally (D-001).
- Mode loop (`:678`): `ask` for `default`, `acceptEdits`, `auto`; `deny` with the `! <command>` ending for `undefined`, `plan`, `bypassPermissions`, `dontAsk`; the `why` list becomes `[null, null, null, "mode", "mode", "mode", "mode"]`. Sessions stay distinct per mode so `refused_before` never fires.
- Unlisted-mode test (`:714`): the mode list becomes `[undefined, "plan", "bypassPermissions", "dontAsk"]`, with four `["denied", "mode"]` rows.
- PowerShell test (`:856`): title and body expect `ask` in `auto` (session `ps-auto`) and a mode deny in `bypassPermissions` (its own session); the `refused_before` check on `ps-default` stays; the expected rows follow the new order.
- The earlier item's design.md gets the D-003 (r3) edit described in D-003 above, and this revision log line: `- 2026-10-17: D-003 (r3): auto joins ASKING_MODES; the silent record was invalid (hook never ran), the PowerShell re-run showed the dialog (9a4f317)`.

**Done when:**
- **T-1.1** `ASKING_MODES` holds exactly `default`, `acceptEdits` and `auto`.
- **T-1.2** With `permission_mode: "auto"`, `PICKET_ESCALATE="you asked me to push the release tag" git push origin v1.0.0-alpha.2` (Bash) and `$env:PICKET_ESCALATE = "you asked me to push the release tag"; git push origin v1.0.0-alpha.2` (PowerShell) each get `permissionDecision: "ask"` and append one ledger row with `outcome: "ask"` and `why: null`.
- **T-1.3** With `permission_mode` `bypassPermissions`, `dontAsk`, `plan` or absent, the Bash push denies with `why: "mode"` and a reason ending `run it yourself: ! git push origin v1.0.0-alpha.2`; no marked command gets `allow` in any mode.
- **T-1.4** The set test fails when `auto` is in `ASKING_MODES` and `interactive.auto_dialog` in `bench/results/ask-probe.json` is not `"shown"`.
- **T-1.5** Piping a PreToolUse event (`tool_name: "Bash"`, `permission_mode: "auto"`, a fresh `session_id`) for the Bash push into `node core/hooks/guard.bash.mjs` prints `"permissionDecision":"ask"`; the same event with `permission_mode: "bypassPermissions"` prints `"permissionDecision":"deny"`.
- **T-1.6** The earlier item's design.md has `### D-003 (r3): Ask only where the dialog is proven`, no `### D-003 (r2)` heading, a RISK-005 that no longer says auto proved silent, and its revision log ends with one D-003 (r3) line of at most 30 words; its `## Phase 6` and frontmatter are byte-identical to HEAD.
- **T-1.7** `npm test` passes.

## Open questions

- **OQ-001** Does interactive auto mode show the dialog for a hook `ask` on the Bash tool too? Run `node bench/probe-ask.mjs --interactive`, ask the session to run the sentinel with the Bash tool, and read `tool` in the hook log. Owner: user. Fallback: auto stays in for both tools on the headless Bash cell (D-002); a `silent` answer amends D-002 to a per-tool set.

## Revision log
