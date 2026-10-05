Tether plugin spike follow-up: a research work item, no product code. Answer four questions the first spike (20261004-tether-plugin-spike-eleven-packaging-checks) left open, each with pass or fail, what was observed, and the path of the event log that shows it.

Checks:

11. Do subagents load the project's `CLAUDE.md` and `.claude/rules/` files? (Decides whether the block `tether init` writes reaches teammates; SDR-00001 D-003.)
12. How much text does a SubagentStart hook inject before it is cut, and how is it cut? (SDR-00001 RISK-001; SessionStart is documented at 10,000 characters.)
13. In what order do a plugin's hooks and the project's own hooks run on the same event, and does a deny from either stop the tool call?
14. Can a project's settings pin a plugin version, so a teammate gets the same version after the marketplace moves on?

Constraints: the same as the first spike (`spike/HANDOFF.md`). Claude Code only; subscription only, with `ANTHROPIC_API_KEY` unset and no `apiKeyHelper`, checked before the first run; `--model haiku` and `--max-budget-usd 1` on every run; serial runs; `--plugin-dir spike/tether` for 11 to 13; check 14 only with `--scope project` inside a fixture copy, cleaned up with the same scope; never user scope; never push; new files only under `spike/`; no comments in code. Reuse `spike/run.mjs` and `spike/tether/`; `spike/marketplace/` may have been deleted and can be rebuilt from `spike/tether/`.

Output: the findings in this item's report, with a one-line consequence for SDR-00001 per check.
