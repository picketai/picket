---
name: mod-theme-tokens
description: Claude Code theme tokens the Picket mods already render (safe to design on), and that grepping the Claude Code binary for more is refused by auto mode
metadata:
  type: reference
---

Tokens the mods rendered before item 07a, so known to work (2026-10-23, Claude Code 2.1.308): text `claude`, `inactive`, `promptBorder`, `warning`, `error`, `success`, `suggestion`, `permission`, `claudeShimmer`; backgrounds `bashMessageBackgroundColor`, `userMessageBackground`, `userMessageBackgroundHover`.

Per-role tokens (such as the subagent colours) are unverified. A grep of the Claude Code executable for token names was denied by the auto-mode classifier, and no plugin-authoring skill file was found under the user's Claude folder or the repository. Item 07a records this as OQ-001 with a fallback onto the tokens above.

**How to apply:** design mod colours on the listed tokens; put any other token behind an open question that the developer settles from the mod types or a mod test render. Related: [[claude-cli-plugin-facts]].
