---
kind: report
title: Tether spike follow-up, outline of checks 11 to 14
date: 2026-10-05
audience: developer
sources:
  - work/20261005-tether-spike-follow-up-four-open-checks/request.md
  - artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md
  - .claude/MEMORY.md
  - work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md (authored by this analyst in the earlier pass; findings reused)
  - spike/run.mjs and spike/tether/ (written by this analyst in the earlier pass; git status shows them unmodified, so not re-read this turn)
  - spike/HANDOFF.md (read in the earlier pass)
confidence: medium
---
# Report: Tether spike follow-up, outline of checks 11 to 14

## Summary

Nothing has run. All four checks can be answered with the existing runner and plugin plus a small set of new hook scripts and fixtures, for about 16 to 19 `claude -p` runs on haiku (check 14 needs no model run) and an estimated $1 to $2 in total, each run under the $1 cap [INFERRED]. Checks 11 and 12 decide SDR-00001 D-003 and RISK-001, because rules injected by hook only work if teammates do not already get them natively and if the SubagentStart text is not cut below 5,766 characters [VERIFIED, SDR-00001 D-003, RISK-001]. The stream shows hook events only for SessionStart, so checks 12 and 13 must carry their own evidence: hook logs written to `.tether/state/` and the probe's transcript [VERIFIED, earlier spike R-016]. Check 14 depends on what the Claude Code docs say about pinning, which has not been read yet; the deep pass reads them first and tests only the pins the docs name [ASSUMED].

## Context

Asked: four open questions from the first spike, each with pass or fail, what was observed, the event log path, and a one-line consequence for SDR-00001. Not read this turn: the Claude Code docs on marketplaces and hooks (the deep pass reads them), and the files of the earlier spike beyond what this analyst wrote (`git status` shows `spike/run.mjs` and `spike/tether/` unchanged since, so the earlier knowledge of them holds) [INFERRED]. Today `spike/marketplace/`, `spike/.runs/` and `bench/.runs/` exist and may be deleted by the owner; the plan rebuilds what it needs.

## Structure

Existing pieces reused: `spike/run.mjs` (`RUNS` table of prompt plus setup, `runCheck`, `preflight`, trust, approver, copy of `.tether/state/hook-log.jsonl`), `spike/tether/` (probe agent on sonnet with `memory: project` and the `ordering` skill, hooks `session`, `subagent`, `guard`, `stop`), `bench/lib/claude.mjs` (`pluginDir`, `model`, `env` options already exist). The existing `runCheck` does not pass `env` to `runClaude`, so per-run environment variables need one small edit [VERIFIED, earlier authorship].

## Findings

- **R-001** [VERIFIED] SDR-00001 D-003 says rules reach the lead and each teammate by SessionStart and SubagentStart injection, total 5,766 characters. RISK-001 says the SubagentStart limit is unmeasured. Checks 11 and 12 test the two premises. `artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md`.
- **R-002** [VERIFIED] In the first spike the stream carried `hook_started` and `hook_response` events for SessionStart only; SubagentStart, PreToolUse, Stop and SubagentStop were seen only through the hook's own log file. Evidence for checks 12 and 13 therefore comes from hook logs and the probe's transcript. `spike/out/3.jsonl`, `spike/out/2-hook-log.jsonl`.
- **R-003** [VERIFIED] The SubagentStop input includes `agent_transcript_path` (key list logged in `spike/out/2-hook-log.jsonl`). The background task output file recorded in `task_notification` was empty in the first spike (`spike/out/4-contains.jsonl`), so the transcript path from the hook is the way to read exactly what a subagent received.
- **R-004** [VERIFIED] A haiku lead reports one marker per reply unless told to list all of them, and reported injected text with a prefix ("SessionStart:startup hook success: ..."). Prompts for checks 11 and 12 must ask for a list and must ask the lead to answer before spawning. `spike/out/4-first.jsonl`, `spike/out/4-contains.jsonl`.
- **R-005** [VERIFIED] A deny from a plugin PreToolUse hook stopped the write ("PreToolUse:Write hook error: tether spike guard"), with no project hook present. Check 13 adds the project hook and the combinations. `spike/out/2.jsonl`.
- **R-006** [VERIFIED] The first spike's check 10 left user-level folders after a project-scope cleanup (`~/.claude/plugins/cache/tether-spike`, `~/.claude/plugins/data/tether-inline`). Check 14 takes a before and after listing of `~/.claude/plugins`. Earlier report R-022.
- **R-007** [VERIFIED] `guard.bash` denies a Bash command that contains `rm`, so cleanup of `spike/.runs` and `bench/.runs` is the owner's, not the analyst's. Earlier report R-023.

## The four checks

All runs: `--model haiku` lead, `--max-budget-usd 1`, serial, `--plugin-dir spike/tether`, approver MCP config, fixture copy trusted then untrusted. The probe agent runs on sonnet by its own frontmatter (Tether's real agents set their own models too). Log names carry a suffix when a check has several runs, as in the first spike.

### Check 11: do subagents load `CLAUDE.md` and `.claude/rules/`?

- Method: fixture copy gets `CLAUDE.md` with the line `Tether marker C-11`, `.claude/rules/spike-rule.md` (no `paths`) with `Tether marker R-11`, and `.claude/rules/nested/deep.md` with `Tether marker R-11n`. Prompt: "Before spawning anything, list every line anywhere in your context that contains `Tether marker`, one per line, as section LEAD. Then spawn the probe (`tether:probe`) and tell it: use no tool, answer from your context only, list every line anywhere in your context (system prompt, project instructions, rules, reminders) that contains `Tether marker`, one per line, or NONE. Write section PROBE with its answer." The Read and Grep tools stay on the probe, so the run also checks its events for any Read of `CLAUDE.md`: a quote from a tool read does not count as loaded context.
- Plugin or hook additions: none.
- Pass condition: PASS when the probe lists C-11 and R-11 without a tool call; FAIL when it lists neither; if it lists only some, the result is reported per file and the one-line SDR consequence says which (CLAUDE.md block reaches teammates or not). The lead is the control: it must list all three.
- Runs: `spike/out/11.jsonl`, `spike/out/11-repeat.jsonl` (same prompt, to see stability), `spike/out/11-general.jsonl` (subagent type `general-purpose`, a built-in agent, to separate "all subagents" from "plugin agents"). Three runs.
- Marker prerequisite: the probe preloads the `ordering` skill (K-6 plugin), which is expected in its list and is ignored.

### Check 12: how much does SubagentStart inject before it is cut, and how?

- Method: new SubagentStart hook `spike/tether/hooks/inject-size.mjs`, active only when environment variable `SPIKE_INJECT_A` (or `SPIKE_INJECT_B`) holds a character count; otherwise it prints nothing, so earlier checks are unaffected. It emits JSON `additionalContext` made of numbered lines `Tether marker L-0001 <padding to 50 characters>` up to exactly N characters, ending with `Tether marker END-12`, and appends N to `.tether/state/hook-log.jsonl`. The hook is added to `hooks.json` after the existing SubagentStart entry. Prompt: "Spawn the probe (`tether:probe`). Tell it: use no tool; report the highest `Tether marker L-` number in your context, whether `Tether marker END-12` is in your context, and quote any line that mentions truncation or a saved file. Wait for it, then report its answer." The stop hook also logs `agent_transcript_path`, and the runner copies that transcript to `spike/out/12-<N>-transcript.jsonl`, which shows the exact text and how it was cut (truncated with a notice, spilled to a file, rejected whole, or passed whole).
- Pass condition: the check measures; it passes when the cut point (largest N delivered whole, smallest N cut) is bracketed within 1,000 characters and the cut mechanism is named. If no size up to 100,000 is cut, the answer is "no cut seen up to 100,000" and the check passes with that statement.
- Sizes: 5,000, 10,000, 20,000, 50,000, 100,000 (five runs), then up to three refinement runs between the last whole and the first cut size. One extra run `12-split` uses two hooks of 6,000 each (`SPIKE_INJECT_A` and `SPIKE_INJECT_B`) to see whether the limit is per hook or per event. Five to nine runs.
- Log paths: `spike/out/12-5000.jsonl` and so on, `spike/out/12-split.jsonl`.
- Model note: the reader is the sonnet probe; if its summary and its transcript disagree, the transcript wins.

### Check 13: hook order and deny between a plugin and the project

- Method: fixture copy gets `.claude/settings.json` with a PreToolUse (`Write`) hook and a SessionStart hook, both exec form with `${CLAUDE_PROJECT_DIR}`, running `.claude/hooks/spike-project.mjs`. The plugin gets `hooks/order.mjs` on PreToolUse (`Write`). Each hook appends one JSON line to `.tether/state/order-log.jsonl` with its source (`plugin` or `project`), start and end times (epoch milliseconds), and process id. The plugin hook sleeps 200 ms before logging its end so that parallel and serial execution can be told apart (parallel starts within a few tens of milliseconds; serial starts at least 200 ms apart). Each hook denies when its own variable is set (`SPIKE_DENY` equal to `plugin`, `project` or `both`), with the reason "tether spike deny plugin" or "tether spike deny project". The project SessionStart hook prints `Tether marker O-project` while the plugin's `session.mjs` prints `Tether marker S-3`; the order of the two `hook_started` and `hook_response` events in the stream is the SessionStart order.
- Prompt: "Use the Write tool to create `notes-13.txt` containing `hello`, then say exactly what the tool returned and whether the file exists." The runner then lists the fixture copy to `spike/out/13-<variant>-files.txt`.
- Pass condition: order is recorded, not graded. DENY passes when the file is absent in `plugin-deny`, `project-deny` and `both-deny`, and present in `none`. In `both-deny`, the returned message (which reason, or both) is recorded.
- Runs: `13-none` (twice, `13-none` and `13-none-repeat`, to see whether the order is stable), `13-plugin-deny`, `13-project-deny`, `13-both-deny`. Five runs. Logs: `spike/out/13-<variant>.jsonl` plus `13-<variant>-order-log.jsonl`.
- Note: the project hook runs only because the runner marks the fixture as trusted.

### Check 14: can project settings pin a plugin version?

- Method, no model run: read the Claude Code docs on plugin marketplaces first (version pinning, `ref` and `sha` on marketplace and plugin sources, `enabledPlugins` value forms); test only the pin forms the docs name, using a rebuilt local git marketplace `tether-spike-pin` (not the old name, to avoid stale registry entries). Candidate forms: (a) marketplace declared in project settings with a git source and a `ref` set to the tag of version 0.0.1-spike; (b) a plugin entry in `marketplace.json` with a pinned `ref` or `sha`; (c) a version suffix in `enabledPlugins`. Steps per form: build `spike/marketplace/` from `spike/tether/` with two commits and two tags (0.0.1-spike, 0.0.2-spike); in a fixture copy run `claude plugin marketplace add ... --scope project`, `claude plugin install ... --scope project`; move the marketplace on to 0.0.2-spike; run `claude plugin marketplace update` and `claude plugin update --scope project`; `claude plugin list`. Then simulate the teammate: a second fixture copy containing only the committed project `.claude/settings.json` from the first copy, with `claude plugin install tether@tether-spike-pin --scope project` (or the install prompt path the docs describe), and `claude plugin list`.
- Pass condition: PASS when, after the marketplace has moved to 0.0.2-spike, the teammate copy installs 0.0.1-spike from the project settings alone (and the first copy stays on 0.0.1-spike after an update). FAIL when no documented or working form keeps the teammate on the old version.
- Logs: `spike/out/14.jsonl` (command, exit code, stdout and stderr for every `claude plugin` call), `14-registry-before.json` and `14-registry-after.json` (the three registry files under `~/.claude/plugins`), one `14-<form>.jsonl` per tested form.
- Cleanup: `claude plugin uninstall ... --scope project` and `claude plugin marketplace remove ... --scope project`, then the registry listing again; leftover cache folders are recorded, not deleted.
- Model: none; no quota spent.

## Files to create or edit under `spike/`

Edit:
- `spike/run.mjs`: add `env` to the per-run spec and pass it to `runClaude`; add runs `11`, `11-repeat`, `11-general`, `12-*`, `13-*`; add fixture setup functions that copy `spike/fixtures/<check>/` into the run copy; copy `order-log.jsonl`, the file listing and the probe transcript into `spike/out/`; accept the check-12 sizes from the command line.
- `spike/tether/hooks/hooks.json`: add the SubagentStart `inject-size` entries (A and B) and the PreToolUse `order` entry.
- `spike/tether/hooks/stop.mjs`: also log `agent_transcript_path`.

Create:
- `spike/tether/hooks/inject-size.mjs` (check 12)
- `spike/tether/hooks/order.mjs` (check 13)
- `spike/fixtures/11/CLAUDE.md`, `spike/fixtures/11/.claude/rules/spike-rule.md`, `spike/fixtures/11/.claude/rules/nested/deep.md`
- `spike/fixtures/13/.claude/settings.json`, `spike/fixtures/13/.claude/hooks/spike-project.mjs`
- `spike/pin.mjs` (check 14, separate file so `run.mjs` stays one runner for model runs)
- `spike/marketplace/` rebuilt by `spike/pin.mjs` (two commits, two tags), if the owner deleted it
- `spike/out/11*.jsonl`, `12-*.jsonl`, `13-*.jsonl`, `14*.jsonl` and their side files

No edits outside `spike/`. The earlier edits to `bench/lib/claude.mjs`, `bench/run.mjs` and `bench/adapters/plugin.mjs` stay as they are.

## Preflight before the first `claude -p`

1. `ANTHROPIC_API_KEY` unset in the runner's shell and no `apiKeyHelper` in `~/.claude/settings.json`, `.claude/settings.json` or `.claude/settings.local.json` (the existing `preflight()` in `spike/run.mjs` throws otherwise); `pin.mjs` calls the same function even though it makes no model run.
2. `claude --version` recorded (2.1.282 last time).
3. `--model haiku` and `--max-budget-usd 1` on every run; serial; stop and wait on a rate-limit or quota error rather than retrying in parallel.
4. Before check 14: snapshot of `~/.claude/plugins` registry files, and confirmation that no `tether-spike` or `tether-spike-pin` entry is already registered.
5. User scope never used; `--scope project` and the working directory inside a fixture copy for every `claude plugin` command.
6. Stop rule for this item: if check 11 or 12 shows the SubagentStart route cannot deliver the shipped rules (cut below 5,766 characters, or delivery fails), stop that branch and report it as the consequence for SDR-00001 D-003 and RISK-001; continue with 13 and 14, which do not depend on it.

## Expected runs and spend

| Check | Model runs | Estimated spend |
|---|---|---|
| 11 | 3 | about $0.15 |
| 12 | 6 to 9 (5 sizes, 1 split, up to 3 refinements) | about $0.4 to $0.9 (the 50,000 and 100,000 character runs read 12,000 to 25,000 extra tokens on the sonnet probe) |
| 13 | 5 | about $0.2 |
| 14 | 0 | none |
| Total | 14 to 17 | about $0.8 to $1.3, each run under the $1 cap |

The estimate is from the first spike, where a haiku run with one sonnet probe cost $0.03 to $0.07 [INFERRED].

## Risks and unknowns

- [UNKNOWN] OQ-001: whether a SubagentStart hook may inject through plain stdout as well as `additionalContext`; check 12 tests `additionalContext` only, as the first spike did. Plain stdout is not tested unless the owner asks.
- [UNKNOWN] OQ-002: whether the cap is by characters or by tokens. The sizes are in characters; the transcript shows the cut line, from which characters can be counted.
- [UNKNOWN] OQ-003 [ARCHITECT REVIEW NEEDED]: check 14 may be untestable without a remote repository if the docs require a git remote for `ref` and `sha` pins; a local git path or `file://` URL may or may not be accepted as a git source. If not, the answer is "not testable locally, documented form is X" and the owner decides whether to allow one remote test.
- [UNKNOWN] OQ-004: hook order may differ between Windows and other systems, and between runs; two repeats of `13-none` show stability on this machine only.
- [UNKNOWN] OQ-005: for check 11, a project `CLAUDE.md` could reach subagents through a path that the haiku lead's wording hides; the transcript-based evidence (probe quotes without a tool call) is what counts.
- [ASSUMPTION] The research lane's closing heading `## Research closed:` belongs to the lead's packet; this report keeps `## Report:`.
- [ASSUMPTION] Coverage: this outline read the request, SDR-00001 and `.claude/MEMORY.md` this turn; `spike/run.mjs` and `spike/tether/` come from the earlier pass.

## Recommendations

- The owner can redirect on OQ-003 (remote test or not) and on the split run in check 12 before the deep pass. [ARCHITECT REVIEW NEEDED]

## Sources for the deep pass

- Claude Code documentation on hooks (SubagentStart output, size limits, execution order, deny behaviour): checks 12 and 13.
- Claude Code documentation on memory, `CLAUDE.md`, rules and subagents: check 11.
- Claude Code documentation on plugin marketplaces and settings (`extraKnownMarketplaces`, `enabledPlugins`, `ref`, `sha`, version pinning): check 14.
- `spike/run.mjs`, `spike/tether/hooks/hooks.json`, `spike/tether/hooks/stop.mjs`: re-read before editing.
- `spike/out/2-hook-log.jsonl`, `spike/out/3.jsonl`: the event shapes reused as evidence.

## Glossary

- **Teammate**: an agent the lead starts with the Agent tool, a subagent in Claude Code terms (`.claude/MEMORY.md`).
- **Cut**: the point at which hook text is shortened, spilled to a file or rejected by Claude Code before the agent reads it.
