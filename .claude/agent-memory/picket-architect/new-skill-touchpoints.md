---
name: new-skill-touchpoints
description: Every file and test a new skill under src/skills must satisfy (routing cases, plugin.json, docs section, Use when, skills shape test), and the CLAUDE.md template prefix check
metadata:
  type: reference
---

Checked 2026-10-29 while ordering work/20261029-convert-the-developer-agent-item-a:

- `test/repo/descriptions.test.mjs` needs a `test/repo/description-cases.json` entry for every non-lane skill (3 or more positive, 2 or more negative cases with existing owners), a 95 % routing share, and no two descriptions at cosine 0.75 or more. An agent-only skill is not exempt.
- `test/timing/budgets.test.mjs` requires "Use when" in every skill description (1,024 characters at most).
- `src/.claude-plugin/plugin.json` lists every skill folder (`test/repo/plugin-layout.test.mjs`), and `docs/reference/skills.md` (hand-written, not generated) needs a `## picket:<name>` section (`test/repo/docs.test.mjs`).
- `test/repo/skills.test.mjs` hard-codes `EVERY_SKILL` for `PENDING`, so a new skill must pass the shape checks outright.
- `test/kernel/init.test.mjs` asserts `CLAUDE.md` starts with `src/templates/claude-block.md`; edit both together.
- `npm test` runs `scripts/build.mjs` before the product tests, so it rewrites `dist/`; while a bench reads `dist/`, use `npm run typecheck`, `node scripts/test.mjs unit` and `node --test` on src-reading repo tests.

Checked 2026-10-29 while ordering work/20261029-lane-skills-and-the-end-of-shared:

- The "Use when" budget check and the routing vectors both read only `description` (`frontmatterDescription` in `test/support/routing.mts`), so moving triggers to `when_to_use` needs that helper changed first.
- `test/repo/agents.test.mjs` compares each shell's `## Entry` with the field keys of `sendsFor` messages over its `ENTRY_FIXTURES`; a new send field needs the shell sentence and a fixture in the same phase.
- `test/repo/references.test.mjs` fixtures name real skill paths (existence is checked), and `test/repo/plugin-layout.test.mjs` asserts `src/skills/shared/procedures` exists; renames and removals there break both.
- The artifact parser takes only the first backticked path of each `**Touch set:**` bullet, so one path per bullet.

**How to apply:** list these in the touch set of any phase that adds or renames a skill. Related: [[zone-and-root-facts]], [[block-format-couplings]], [[generated-tracked-files]].
