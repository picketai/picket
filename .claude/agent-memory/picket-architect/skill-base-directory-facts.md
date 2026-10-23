---
name: skill-base-directory-facts
description: The lead sees "Base directory for this skill" when a skill loads, a subagent's preloaded skill shows no base line; agents resolve skill paths through the plugin root
metadata:
  type: project
---

Checked 2026-10-23 in this repo's transcripts (item 08a design): when the lead loads a skill, Claude Code prints `Base directory for this skill: D:\workspace\github\AISpec\core\skills\designing` before the body, with the frontmatter stripped. A reviewer subagent with `picket:reviewing` preloaded shows the skill body with frontmatter and no base line. Since item 01, `npm run claude` passes `--plugin-dir dist` (`scripts/claude.mjs`), so the base line now names the built dist skills folder instead of core (inferred from the launcher, not re-read in a transcript). Agents read skill files in the plugin root's skills folder or, in this repo, under `src/skills/`, guided by `${CLAUDE_PLUGIN_ROOT}/skills/` in `src/agents/developer.md`.

**Why:** item 08a removes the "Paths cited here" line from every SKILL.md and moves shared steps to a shared procedures folder under src/skills, so path forms depend on who reads them.

**How to apply:** lead-facing skill text can cite `../shared/procedures/<file>` relative to the base line; agent-facing text (a `step:` value, a pasted agent section, an agent file) needs a plugin-root anchor. Related: [[markdown-paths-facts]], [[claude-cli-plugin-facts]].
