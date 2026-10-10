---
kind: order
lane: order
title: Marketplace is picketai, not picket-dev
date: 2026-10-10
audience: developer
sources: request.md; comments.jsonl; git grep picket-dev outside work/, artifacts/ and bench/results/ (10 files); core/lib/init.mjs:10-16; core/lib/hooks/guard.comments.mjs (approvals match as a set); .claude-plugin/marketplace.json; .github/workflows/release.yml:18-30; README.md:36; CONTRIBUTING.md:23; docs/how-to.md:52-53, 246-265; .claude/MEMORY.md:47
phases:
  - n: 1
    files:
      - .claude-plugin/marketplace.json
      - core/lib/init.mjs
      - test/kernel/init.test.mjs
      - test/kernel/plugin-layout.test.mjs
      - bench/test/adapters.test.mjs
      - docs/how-to.md
      - README.md
      - CONTRIBUTING.md
      - .github/workflows/release.yml
    greps:
      - path: .claude-plugin/marketplace.json
        pattern: '"name": "picketai"'
      - path: core/lib/init.mjs
        pattern: 'const MARKETPLACE_NAME = "picketai";'
      - path: .github/workflows/release.yml
        pattern: 'actions/checkout@[0-9a-f]{40} # v4$'
      - path: .github/workflows/release.yml
        pattern: 'actions/setup-node@[0-9a-f]{40} # v4$'
    tests: true
    drive: true
---
# Order: Marketplace is picketai, not picket-dev

## Problem

The marketplace that `picket init` registers is still called `picket-dev`, so users would install `picket@picket-dev`. The plugin id is written into each user's `.claude/settings.json` and into the plugin-cache read rule, so it has to be final before the first npm publish. The user approved `picketai`. Records keep the old name. The same change also adds the user-approved `# v4` comments after the two pinned action SHAs in the release workflow.

## Decisions

### D-001: one constant carries the new name; nothing keeps the old one
**Decision:** `MARKETPLACE_NAME` in `core/lib/init.mjs:10` becomes `"picketai"`. From it come `PLUGIN_ID` (`picket@picketai`), the settings rule `Read(~/.claude/plugins/cache/picketai/**)`, the install commands and the run-by-hand hint. `.claude-plugin/marketplace.json` takes the same `name`, and `test/kernel/plugin-layout.test.mjs` pins it. No alias, migration or cleanup of `picket-dev` entries ships. This follows the rename item's ruling: no backward support for an old name before the alpha. Once the package is published, the name is part of every install and is [IRREVERSIBLE] in practice. Today it is still a plain edit.
**Instead of:** having `init` also remove a project's old `picket-dev` entries: only the owner's own projects ever installed it, and code for that would ship to every user forever.
**Risks:**
- **RISK-001** A project already set up with `picket-dev` gets a second `picket` plugin after `picket init` runs again, so every skill shows twice. Mitigation: before re-running `init` there, run the uninstall commands with the old names (`claude plugin uninstall picket@picket-dev --scope project`, `claude plugin marketplace remove picket-dev --scope project`). The lead tells the user at the gate. No repository file needs to say it.

### D-002: the `# v4` comments go in as approved; `.claude/MEMORY.md` goes to the lead
**Decision:** `comments.jsonl` records the approval `# v4` for `.github/workflows/release.yml`. `guard.comments` matches approvals as a set, so the one entry covers both lines. The developer appends exactly ` # v4` to the `uses:` lines of `actions/checkout` (line 22) and `actions/setup-node` (line 26) and changes nothing else in the file. `.claude/MEMORY.md:47` names `picket-dev` in a current decision line. The developer contract keeps the developer out of `.claude/`, so the lead rewrites that line to `picketai` after the close. No phase touches it.
**Instead of:** putting `.claude/MEMORY.md` in the touch set: the developer could not write it, and the phase would stall on a criterion it cannot meet.

## Scope

**In:** every current use of `picket-dev` in code, tests and docs; the two `# v4` comments.
**Out:**
- records (`work/`, `artifacts/`, `bench/results/`) and git history;
- `.claude/MEMORY.md:47` (the lead, after the close);
- `bench/results/plugin-alpha.json`;
- cleanup of existing `picket-dev` installs (RISK-001).

## Phase 1: Rename the marketplace to picketai

**Touch set:**
- `.claude-plugin/marketplace.json`: `name` becomes `picketai`
- `core/lib/init.mjs`: `MARKETPLACE_NAME` at line 10
- `test/kernel/init.test.mjs`: lines 141, 171, 190, 230, 243, 258, 321
- `test/kernel/plugin-layout.test.mjs`: title and assertion, lines 112 and 114
- `bench/test/adapters.test.mjs`: the read rule at line 21
- `docs/how-to.md`: lines 52, 53, 246, 247, 255, 256, 265
- `README.md`: line 36, drop "(provisional name)"
- `CONTRIBUTING.md`: line 23, rename and drop "is provisional"
- `.github/workflows/release.yml`: ` # v4` on lines 22 and 26

**Changes:** Per D-001 and D-002. Replace `picket-dev` with `picketai` everywhere listed, including the `extraKnownMarketplaces` keys in the init test fixtures. `README.md:36` reads "the root marketplace picketai: one plugin, picket, from ./core". `CONTRIBUTING.md:23` drops the sentence "The marketplace name `picket-dev` is provisional." and renames the rest. No assertion changes meaning. Drive with `picket drive --run`: run `node core/bin/picket.mjs init --root <temp folder> --no-install`, then print the allow list from the temp folder's `.claude/settings.json`. Then run `claude plugin validate .` on the repository root.

**Done when:**
- **T-1.1** `git grep -n picket-dev -- . ':!work/' ':!artifacts/' ':!bench/results/' ':!.claude/MEMORY.md'` prints nothing.
- **T-1.2** Drive: in the temp project, `init --no-install` writes the allow rule `Read(~/.claude/plugins/cache/picketai/**)`, and `claude plugin validate .` passes.
- **T-1.3** `test/kernel/init.test.mjs` expects `["plugin", "install", "picket@picketai", "--scope", "project"]`, and `test/kernel/plugin-layout.test.mjs` asserts `marketplace.name` is `picketai`.
- **T-1.4** `git diff -- .github/workflows/release.yml` shows exactly two changed lines, each the old `uses:` line with ` # v4` appended, and `guard.comments` allowed the edit.
- **T-1.5** `README.md` and `CONTRIBUTING.md` no longer contain the word "provisional" about the marketplace.
- **T-1.6** `npm test` passes.

## Open questions

none

## Revision log
