---
kind: design
lane: design
title: Docs with one job each
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/08b-docs.md, artifacts/refactor/00-conventions.md, README.md, CONTRIBUTING.md, docs/how-to.md, docs/skills.md, docs/agents.md, src/lib/hooks/README.md, src/lib/verbs.mts, src/lib/hooks.mts, src/lib/mods.mts, src/lib/cli/main.mts, src/lib/cli/registry.mts, src/lib/shared/verb-spec.mts, src/lib/shared/action.mts, src/lib/shared/config.schema.json, src/lib/verbs/uninstall/index.mts, src/lib/verbs/uninstall/uninstall.mts, scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, package.json, test/repo/names.test.mjs, test/repo/dashes.test.mjs, test/repo/markdown-paths.test.mjs, test/repo/references.test.mjs, test/repo/mods.test.mjs, test/repo/package.test.mjs, work/2026102*-refactor-item-*/design.md]
phases:
  - n: 1
    files: [scripts/docs.mjs, scripts/build.mjs, package.json, docs/reference/cli.md, docs/reference/hooks.md, docs/reference/mods.md, test/repo/docs.test.mjs]
    greps:
      - path: package.json
        pattern: '"docs": "node scripts/docs\.mjs"'
      - path: scripts/build.mjs
        pattern: 'writeReferencePages'
      - path: docs/reference/cli.md
        pattern: '^## picket uninstall\b'
      - path: docs/reference/cli.md
        pattern: '^### picket source find\b'
      - path: docs/reference/hooks.md
        pattern: 'Bash.\|PowerShell'
      - path: docs/reference/mods.md
        pattern: 'picket-session'
      - path: test/repo/docs.test.mjs
        pattern: 'npm run docs'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [docs/reference/skills.md, docs/reference/agents.md, CHANGELOG.md, README.md, docs/how-to.md, test/repo/docs.test.mjs, test/repo/names.test.mjs, test/repo/dashes.test.mjs]
    greps:
      - path: CHANGELOG.md
        pattern: '^## 1\.0\.0-alpha\.4 \(not released yet\)'
      - path: CHANGELOG.md
        pattern: '^## 1\.0\.0-alpha\.3 and earlier\b'
      - path: CHANGELOG.md
        pattern: 'pullrequest post <url> --file <file>'
      - path: README.md
        pattern: '\(CHANGELOG\.md\)'
      - path: README.md
        pattern: '\(docs/how-to\.md#the-daily-loop\)'
      - path: README.md
        pattern: '^(?![\s\S]*\n## Status\b)'
        flags: i
      - path: README.md
        pattern: '^(?![\s\S]*\| Lane \| When)'
        flags: i
      - path: docs/reference/skills.md
        pattern: '\(\.\./how-to\.md#the-daily-loop\)'
      - path: docs/how-to.md
        pattern: '\(reference/agents\.md\)'
      - path: test/repo/names.test.mjs
        pattern: 'newestEntry'
      - path: test/repo/dashes.test.mjs
        pattern: 'CHANGELOG\.md'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [docs/how-to.md]
    greps:
      - path: docs/how-to.md
        pattern: 'Node\.js 22 or later'
      - path: docs/how-to.md
        pattern: 'lanes\.fast\.max_files'
      - path: docs/how-to.md
        pattern: 'lanes\.design\.max_phases'
      - path: docs/how-to.md
        pattern: '--remove-work'
      - path: docs/how-to.md
        pattern: '\(reference/cli\.md\)'
      - path: docs/how-to.md
        pattern: '^(?![\s\S]*Node\.js 20)'
        flags: i
      - path: docs/how-to.md
        pattern: '^(?![\s\S]*claude plugin uninstall)'
        flags: i
    tests: true
    drive: false
    security: false
  - n: 4
    files: [CONTRIBUTING.md]
    greps:
      - path: CONTRIBUTING.md
        pattern: 'artifacts/refactor/00-conventions\.md'
      - path: CONTRIBUTING.md
        pattern: '\(C-001\)'
      - path: CONTRIBUTING.md
        pattern: '\(C-019\)'
      - path: CONTRIBUTING.md
        pattern: 'npm run docs'
      - path: CONTRIBUTING.md
        pattern: 'picket uninstall'
      - path: CONTRIBUTING.md
        pattern: '^(?![\s\S]*claude plugin marketplace remove)'
        flags: i
    tests: true
    drive: false
    security: false
---
# Design: Docs with one job each

## Problem

The README, the how-to, `docs/skills.md`, `docs/agents.md` and `src/lib/hooks/README.md` repeat each other: the lanes are described three times with different limits, the hook table and the quick reference are kept by hand, and the README's Status section is a changelog that grows each release (`artifacts/refactor/08b-docs.md#Today`). Items 01 to 08a renamed verbs, moved `core/` to `src/`, built `picket uninstall` and gave every verb, hook and mod a one-line `summary`, so the docs are now partly wrong (Node 20 in the how-to, the undo-by-hand paragraph in `CONTRIBUTING.md`). The approved draft `artifacts/refactor/08b-docs.md` (G-1 to G-7, its migration) is the source of truth; the user chose on 2026-10-22 to commit the generated pages. Binding: no em or en dash anywhere (the 08a dash check runs in `npm test`), docs name only existing verbs, and the changelog entry describes what the refactor actually shipped.

## Decisions

### D-001: One job per document, one lanes table
**Decision:** Infrastructural decision, carrying G-1 and G-5. Each document owns one thing and points to the others:

| Document | Owns |
|---|---|
| `README.md` | what Picket is, one line per lane linking the how-to's table, the top level of `src/` and `dist/`, benchmarks, the comparison, the maintainer note, links to the how-to, `docs/reference/` and `CHANGELOG.md` |
| `docs/how-to.md` | everything a user does, and the only lanes table |
| `docs/reference/skills.md`, `docs/reference/agents.md` | one section per skill or agent, by hand (moved from `docs/`) |
| `docs/reference/cli.md`, `hooks.md`, `mods.md` | generated from the lists (D-002) |
| `docs/style-checklist.md` | the manual styling checklist (unchanged, 07b) |
| `CHANGELOG.md` | changes per release (D-005) |
| `CONTRIBUTING.md` | building, testing, the layout under `src/`, the conventions as rules (D-007) |

The lanes table's limits name their config key and default, read from `src/lib/shared/config.schema.json`: fast "a few files (`lanes.fast.max_files`, 3 by default)", order "`lanes.order.max_phases` phases and `lanes.order.max_decisions` decisions (3 and 5 by default)", design the same keys under `lanes.design` (10 and 8). The four lane sections of `skills.md` drop their own limits and link the how-to's table.
**Instead of:** keeping the README's lanes table as the summary and the how-to's as the detail: two tables already disagree today ("no new surface, dependency" in one, "nothing new to design" in the other), which is the drift G-1 removes.
**Risks:**
- **RISK-001** A reader landing on the README loses the at-a-glance table. Mitigation: four one-line lane descriptions stay, each with its skill name, and the link goes to the table's heading.

### D-002 (r2): Three reference pages generated by `scripts/docs.mjs`
**Decision:** Infrastructural decision, carrying G-2. `scripts/docs.mjs` (plain `.mjs` like `scripts/build.mjs`, importing `src/` `.mts` files directly under Node 24) exports:
- `REFERENCE_DIR` (`docs/reference`) and the page names `cli.md`, `hooks.md`, `mods.md`.
- `cliPage(commands, exit)`, pure. `commands` is `{ command, summary, usage, leadOnly }[]` in `listCommands()` order; `exit` is `EXIT` from `src/lib/shared/action.mts`. A plain verb is `## picket <verb>`; a group verb is `## picket <group>` with the group's summary, then `### picket <group> <sub>` per subverb. Each command section holds its summary as a sentence (first letter upper case, a full stop added when missing), the line "Only the lead runs it; the Bash guard denies it to agents." when `leadOnly`, and a fenced `sh` block with `picket <usage>`. The page opens with one line saying it is generated by `npm run docs` from `src/lib/verbs.mts` and each verb's `usage`, then the usage line of `src/lib/cli/main.mts`, the shared flags (`--root <path>`, `--human`, `--json`, `--pretty`, `picket help <verb>`) and the exit codes from `exit`.
- `hooksPage(hooks)`, pure: the generated line, one paragraph on the hook kinds, covering every kind prefix in `HOOKS` (`guard.*` deny or bounce, `lint.*` and `monitor.*` feed text back, `observe.*` and `emit.*` record, `inject.*` add context, `route.*` applies a verdict to the work item, `notify.*` tells the user; the first six come from `src/lib/hooks/README.md`, which misses the last two), and the table `| Hook | Events | Matcher | Does |`, one row per `HOOKS` entry in list order: each event once in order, each distinct matcher once in backticks, the summary. Every `|` inside a cell is written `\|`.
- `modsPage(mods)`, pure: the generated line and `| Mod | Plugin | Installed | Does |`, one row per `MODS` entry, "by `picket init`" for `default` and "on request" for `opt-in`, then the install command `claude plugin install <plugin>@picketai --scope project` for each opt-in mod.
- `referencePages()`, async: builds the three `{ path, text }` from `VERB_NAMES`, `listCommands` and `REGISTRY` (`src/lib/cli/registry.mts`, the only map from a command to its `usage`), `HOOKS`, `MODS` and `EXIT`; text uses `\n` and ends with one.
- `writeReferencePages()`, async: writes a page only when its text differs from the file with `\r\n` read as `\n`, and returns the paths it wrote.
Run directly (the same main check as `scripts/build.mjs`), it prints each written path or `docs/reference is current`. `package.json` gains `"docs": "node scripts/docs.mjs"`, and `buildAll` awaits `writeReferencePages()` after `buildMods()`, as it already writes the tracked `.claude-plugin/marketplace.json`. `scripts/watch.mjs` does not regenerate the pages. The draft's `core/hooks/README.md` is today's `src/lib/hooks/README.md`; it goes in phase 4, once `CONTRIBUTING.md` holds its authoring text.
**Instead of:** generating from `dist/` after the build: `npm run docs` would then need a build first, and `scripts/build.mjs` already imports `src/lib/hooks.mts` and `src/lib/mods.mts` the same way.
**Risks:**
- **RISK-002** The build now loads every verb module through Node's type stripping, so `npm run build` and `npm run claude` take longer. Mitigation: the phase 1 block reports the build's wall time before and after; past 2 s the developer stops with the numbers.
- **RISK-003** A summary or usage holding a backticked path makes the markdown path test check it in `docs/reference/`. Mitigation: today's summaries cite `rules/`, `phases/`, `.picket/state/` and `.picket/state/drive-log.jsonl`, all in `ELSEWHERE`, and `bench/schema/ledger-v2.schema.json`, which exists; `npm test` in phase 1 proves it.

### D-003: The staleness test reads the copy git has
**Decision:** Infrastructural decision, carrying G-2 and draft R-1. `test/repo/docs.test.mjs` regenerates the pages in memory with `referencePages()` and compares each with its blob in the git index (`git show :docs/reference/<page>`), `\r\n` read as `\n`. A pure `stalePages(pages, readCommitted)` returns one message per page that differs or is missing: `docs/reference/<page> is not what git has; run npm run docs and stage it`. In a fresh clone the index is the commit, so CI fails on a commit that forgot a page; locally the test passes once the regenerated page is staged.
**Instead of:** comparing the working file: `npm test` runs the build, which rewrites the pages, before the `product` step, so that test could never fail.
**Risks:**
- **RISK-004** A contributor who changes a summary sees `npm test` fail until they stage the page. Mitigation: the message names both steps; `CONTRIBUTING.md` says so (phase 4).
- **RISK-005** The test needs git. Mitigation: the markdown path test already runs `git ls-files`, and CI checks out with git.

### D-004: Hand-written pages under tests
**Decision:** Infrastructural decision, carrying G-3 and G-5. `docs/skills.md` and `docs/agents.md` move with `git mv` to `docs/reference/`, and every link to them follows. `test/repo/docs.test.mjs` adds three checks over `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/*.md` and `docs/reference/*.md`: every folder under `src/skills/` with a `SKILL.md` has a `## picket:<name>` heading in `docs/reference/skills.md` and every such heading has a folder, and the same for `src/agents/<name>.md` and `docs/reference/agents.md`; every relative Markdown link resolves to an existing file from the citing file's folder (anchors and `http` links are not checked); every `/picket:<name>` names a skill folder. Each check is a pure function with a fixture test that shows it flag a planted problem.
**Instead of:** generating the skills and agents pages from each `SKILL.md` description: the descriptions are trigger phrasings for routing, not reader text, and G-3 keeps the pages by hand.
**Risks:**
- **RISK-006** A link with a wrong anchor passes. Mitigation: accepted; GitHub's heading slugs are not worth copying for six internal links, and a missing file, the common break after a move, is caught.

### D-005: `CHANGELOG.md` with the refactor's real entry
**Decision:** Infrastructural decision, carrying G-4. `CHANGELOG.md` opens with one line (newest release first; each heading is a version), then:
- `## 1.0.0-alpha.4 (not released yet)`: the refactor, under `### Changed, act on these`, `### Fixed`, `### Added` and `### For contributors`, each item one line or a short paragraph, written from the list below.
- `## 1.0.0-alpha.3 and earlier`: the README's Status section, unchanged, except its first paragraph (the alpha and `npm install -g @picketai/picket@alpha`), which stays in the README.
The entry, each item verified against the closed design records and the code:
- Changed: Node 22 or newer (`package.json` `engines`); renames `new` to `open`, `review-summary` to `summary`, `setup-terminal` to `style apply` (`--revert` to `style remove --all`), `pr <url>` to `pullrequest prepare <url>`, `pr <url> --post <file>` to `pullrequest post <url> --file <file>`, `extensions` to `extension list`, `extension new` to `extension add`, `find-verdict` removed, and an old name prints its new one (`src/lib/cli/main.mts` `RENAMED`); `picket uninstall` now removes Picket from the project, the old styling removal is `picket style remove`; a refusal exits 2 with `{ "ok": false, "error": ... }`, including `leave` on a closed item, `source pick` with an unknown label, `source grep` with an invalid regex, an undeclared source and a destructive command given to `check` or `drive`; a configured security path written as a glob (`src/payments/**`) now counts for `admit`, the gate and the review summary, `src/pay` no longer matches `src/payment-ui/`, and a single folder name such as `Authentication/` matches at any depth (04a D-004, 04d); the Bash guard asks before `find -fprint`, `find -fls`, `tree -o`, `rg --pre`, `git log|diff|show --output`, read-only git commands with `-c`, `--config-env`, `--exec-path` or `-p`, and project tools such as `vitest`, `tsc`, `eslint` and `prettier` (05); `npx picket`, `picket.cmd`, `picket.ps1` and `picket --human <verb>` forms of `uninstall`, `waive` and `comment` are denied to agents (07b); a print-only `sed` is allowed inside a protected source (05 D-006); a source whose name is not letters, digits, `_` or `-` is ignored with a warning (04b D-007); the status line prints `200k` for `200.0k` and `3d06h` for `3d6h` (07a); `verify` and `mutate` write their own logs, `verify-test.log` and `mutate-*.log` (04c); `pullrequest prepare`'s `summary` no longer repeats `base` and `head`, which stay top level (04d); findings are written `path:line: text`, and old dash findings still parse (08a).
- Fixed: drive evidence goes to the work item `picket next --latest` names; a malformed `package.json` warns instead of crashing `check`, `drive`, `verify`, `mutate` and `preflight`; a folder with only a `.sln` or `.slnx` counts as .NET; one unreadable line in `verdicts.jsonl` no longer breaks the item; Terminal.app gets Nerd Font icons in the status line; YAML front matter reads a trailing `# comment` and an inline `{...}` map, and unsupported YAML fails with its line number; a silent `drive` command that times out says `timed out after <ms> ms` (04c); an echoed PAT is redacted from `pullrequest` error output, in its Basic, JSON-escaped and percent-encoded forms (04d).
- Added: `picket uninstall` (asks per group, keeps `work/` unless `--remove-work`, leaves a linked `.picket` or `.claude` folder alone, restores files byte for byte, and prints the two machine-level commands); `picket style remove`; `[i] confirm the irreversible step` at an irreversible gate, the stall options, and a stop after three cumulative `CHANGES REQUIRED` in `picket next` (08a); a `warnings` key in `picket state` and `picket next` when a `verdicts.jsonl` line is unreadable (04a); `docs/reference/` with the generated `cli.md`, `hooks.md` and `mods.md`.
- For contributors: source in `src/`, built to `dist/`; Node 24 to build and test; `npm test` runs its steps in parallel, about 50 s where it took 118 to 144 s; `npm run docs`.
**Instead of:** the draft's entry as written: it predates the implementation, misses the items above and says `src/payments/**` "sends admit to the design lane", where the change is that glob entries match at all.
**Risks:**
- **RISK-007** The Status section moved unchanged already names the guard's new prompts, so the two entries overlap once. Mitigation: accepted; the user approved moving it unchanged, and the older heading says "and earlier".

### D-006: The verb and dash checks reach every doc
**Decision:** Infrastructural decision, carrying G-7. In `test/repo/names.test.mjs` the command check also reads `CONTRIBUTING.md` and the newest entry of `CHANGELOG.md`, cut by an exported pure `newestEntry(text)` (from the first `## ` heading to the next), with a fixture test showing an old verb in an older entry is not read. In `test/repo/dashes.test.mjs`, `MARKDOWN_FILES` gains `CONTRIBUTING.md` and `CHANGELOG.md`. `docs/**` is already covered by both.
**Instead of:** checking the whole changelog: older entries keep their historical names (draft R-2).
**Risks:**
- **RISK-008** The newest entry names old verbs on purpose. Mitigation: it names them without the `picket ` prefix (`` `new` is now `open` ``), which the check does not read.

### D-007 (r2): `CONTRIBUTING.md` states the layout and the conventions as rules
**Decision:** Infrastructural decision, carrying G-6. Its sections become, in this order: Layout (`src/` builds `dist/`; verbs, hooks and mods are each a list, `src/lib/verbs.mts`, `src/lib/hooks.mts` and `src/lib/mods.mts`, plus one folder per entry; `shared/`, `util/` and the import direction; tests beside the code), Building and testing (`npm run build`, `npm test`, `npm run watch`, `npm run docs`, Node 24, staging the regenerated pages), Installing from a checkout (`npm run claude`; `picket uninstall` replaces the undo-by-hand paragraph), Code conventions (C-001 to C-019 of `artifacts/refactor/00-conventions.md`, each as a rule sentence, grouped by topic, with that file named as the reasoning), Hooks (the authoring text of `src/lib/hooks/README.md`: the kinds, with `route.*` and `notify.*` added to the README's six, the `HookSpec` folder, exit 0 on failure, the 200 ms budget, the bundle and how to run one), then Markdown, Commits and Releasing as today, Releasing gaining the step that renames the newest `CHANGELOG.md` heading before `npm version`, and last Folders outside the product as today. `src/lib/hooks/README.md` is deleted.
**Instead of:** keeping the hooks README for contributors: its table becomes `docs/reference/hooks.md` and its prose is contributor text, which G-1 gives to `CONTRIBUTING.md`.
**Risks:**
- **RISK-009** Deleting the hooks README stops citing paths that `ELSEWHERE` in `test/repo/markdown-paths.test.mjs` excuses, and that test fails on an uncited entry. Mitigation: `docs/reference/hooks.md` cites the same state paths from the summaries; phase 4 runs `npm test` and edits `ELSEWHERE` if an entry is left uncited.

## Scope

**In:**
- `scripts/docs.mjs`, `npm run docs`, the build writing the pages, three generated pages, their tests.
- `docs/reference/` with the moved skills and agents pages under section, link and slash command tests.
- `CHANGELOG.md`; the README trimmed and linked; the how-to updated (Node 22, the lanes table, the renames, styling, `picket uninstall`, the quick reference); `CONTRIBUTING.md` rewritten; `src/lib/hooks/README.md` removed.
- The verb and dash checks widened to `CONTRIBUTING.md` and `CHANGELOG.md`.

**Out:**
- `docs/design/` (item 09) and `bench/README.md`.
- Shipping docs or the changelog in the npm package (`package.json` `files` unchanged, draft R-3).
- `scripts/watch.mjs` regenerating the pages; checking link anchors; release tooling reading the changelog.
- Any change to a verb, hook or mod summary text; the pages print them as they are.

## Phase 1: Generated reference pages

**Touch set:**
- `scripts/docs.mjs`: new, the generator (D-002)
- `scripts/build.mjs`: `buildAll` writes the pages
- `package.json`: the `docs` script
- `docs/reference/cli.md`, `docs/reference/hooks.md`, `docs/reference/mods.md`: new, generated and committed
- `test/repo/docs.test.mjs`: new, renders and staleness (D-003)
- `src/lib/verbs.mts`, `src/lib/hooks.mts`, `src/lib/mods.mts`, `src/lib/cli/registry.mts`, `src/lib/cli/main.mts`, `src/lib/shared/action.mts`: read only, the inputs
- `test/repo/markdown-paths.test.mjs`, `test/repo/names.test.mjs`, `test/repo/dashes.test.mjs`: read only, they scan the new pages

**Changes:** Per D-002 and D-003. `scripts/docs.mjs` exports `REFERENCE_DIR`, `cliPage`, `hooksPage`, `modsPage`, `referencePages` and `writeReferencePages`, and runs `writeReferencePages()` when started directly. `buildAll` in `scripts/build.mjs` awaits `writeReferencePages()` as its last step. `package.json` gains `"docs": "node scripts/docs.mjs"` after `watch`. Run `npm run docs` and stage the three pages before running `npm test`, since the staleness test reads the index. `test/repo/docs.test.mjs` holds: fixture tests of the three renderers (a group verb gives `##` then `###` sections; a summary `record a thing` gives `Record a thing.`; a lead-only verb gets the lead line; a matcher `a|b` is written `` `a\|b` ``; an opt-in mod gets its install command); a test that `cli.md` has exactly one `## picket <verb>` per `VERB_NAMES` key and one `### picket <group> <sub>` per subverb; `stalePages` over the real pages giving `[]`; and `stalePages` with a fixture reader giving the message that names `npm run docs` for a changed page and for a missing one.

**Done when:**
- **T-1.1** Driven: `npm run docs` on a tree whose pages match prints `docs/reference is current` and changes no file; after deleting `docs/reference/mods.md`, `npm run build` recreates it and `git diff --exit-code docs/reference` exits 0.
- **T-1.2** `docs/reference/cli.md` has one `## picket <verb>` section per `VERB_NAMES` key, one `### picket <group> <sub>` per subverb, each with its summary sentence and a fenced `picket <usage>` line, and `## picket uninstall`, `## picket waive` and `## picket comment` carry the lead line.
- **T-1.3** `docs/reference/hooks.md` has 14 table rows in `HOOKS` order, the `guard.bash` row showing `PreToolUse` and `` `Bash\|PowerShell` ``; its kinds paragraph names all eight prefixes (`guard`, `lint`, `monitor`, `observe`, `emit`, `inject`, `route`, `notify`); `docs/reference/mods.md` has 3 rows and the `claude plugin install picket-session@picketai --scope project` command.
- **T-1.4** `test/repo/docs.test.mjs` passes, including the fixture tests where `stalePages` reports a changed page and a missing page with a message naming `npm run docs`.
- **T-1.5** `npm test` exits 0, with the markdown path, names and dash tests reading the three new pages.
- **T-1.6** The phase block reports `npm run build` wall time before and after the change.

## Phase 2: Reference folder, changelog and README

**Touch set:**
- `docs/skills.md`, `docs/agents.md`: `git mv` to `docs/reference/`; the block lists the old paths
- `docs/reference/skills.md`: lane sections link the how-to's table (D-001)
- `docs/reference/agents.md`: moved, text unchanged
- `CHANGELOG.md`: new (D-005)
- `README.md`: trimmed and linked (D-001)
- `docs/how-to.md`: only the two links to the moved pages
- `test/repo/docs.test.mjs`: section, link and slash command checks (D-004)
- `test/repo/names.test.mjs`: `newestEntry`, wider file list (D-006)
- `test/repo/dashes.test.mjs`: `MARKDOWN_FILES` widened (D-006)
- `work/20261023-refactor-item-0*/design.md`, `src/lib/cli/main.mts`, `package.json`: read only, the changelog's evidence

**Changes:** Per D-001, D-004, D-005 and D-006. Move both pages with `git mv`; in `docs/reference/skills.md` the expediting, ordering, designing and researching sections replace their limits ("at most three files", "at most 3 phases and 5 decisions") with a link to `../how-to.md#the-daily-loop`, and the links to `agents.md` keep working because both pages moved together. `CHANGELOG.md` per D-005: the older section is the README's Status section from its second paragraph on, byte for byte. `README.md`: the second paragraph links the how-to, `docs/reference/` (each page by name) and `CHANGELOG.md`; `## Lanes` becomes four lines, one per lane with its skill name, plus a link to `docs/how-to.md#the-daily-loop`; `## Layout` shrinks to the tracked top-level folders and the top level of `src/` and `dist/`, dropping the untracked `status/`, `session/` and `markdown/` lines; `## Status` goes, leaving one line on the alpha and its install command; Benchmarks, the comparison and the maintainer note stay. In `docs/how-to.md` only the links in "What you get" change to `reference/agents.md` and `reference/skills.md`. Add the D-004 checks to `test/repo/docs.test.mjs` and the D-006 changes to the two tests, each with a fixture test.

**Done when:**
- **T-2.1** `docs/skills.md` and `docs/agents.md` no longer exist and `git ls-files docs` lists `docs/reference/skills.md` and `docs/reference/agents.md`; `grep -niE "at most (3|three) (files|phases)" docs/reference/skills.md README.md` prints nothing.
- **T-2.2** `CHANGELOG.md` opens with `## 1.0.0-alpha.4 (not released yet)` holding the four D-005 groups with every D-005 item, then `## 1.0.0-alpha.3 and earlier`, whose body equals the Status section of `git show HEAD:README.md` after its first paragraph.
- **T-2.3** `README.md` has no `## Status` and no lanes table, links `docs/how-to.md#the-daily-loop`, `docs/reference/cli.md` and `CHANGELOG.md`, and keeps its Benchmarks, comparison and maintainer note sections.
- **T-2.4** The section, link and slash command checks pass on the repository, and their fixture tests flag a skill folder with no section, a section with no folder, a link to a missing file and `/picket:nope`.
- **T-2.5** The names test reads `CONTRIBUTING.md` and the newest `CHANGELOG.md` entry, and its fixture shows `picket frobnicate` reported in the newest entry and not in an older one; the dash test reads `CONTRIBUTING.md` and `CHANGELOG.md`.
- **T-2.6** `npm test` exits 0.

## Phase 3: The how-to

**Touch set:**
- `docs/how-to.md`: Node 22, the lanes table, renames, styling, uninstall, quick reference (D-001)
- `src/lib/verbs/uninstall/index.mts`, `src/lib/verbs/uninstall/uninstall.mts`, `src/lib/verbs/style/remove.mts`, `src/lib/shared/config.schema.json`, `src/lib/cli/main.mts`: read only, what the text describes

**Changes:** Per D-001. Same section order as today. "Before you start" asks for Node.js 22 or later. The lanes table's When column names each limit's key and default (D-001), and the sentence about a fast request growing past 3 files names `lanes.fast.max_files`. "Updating" says 1.0.0-alpha.4 renamed six verbs and removed one, gives one example of the message an old name prints (`picket new` prints `picket: "new" is now "open"`), and links `../CHANGELOG.md` for the list, which stays in the changelog only. "Terminal styling" keeps `picket style apply` and its flags, and describes `picket style remove` (choose items) and `picket style remove --all` (everything) without the word "setup" for the command. "Removing Picket from a project" is rebuilt around `picket uninstall`, run by you in a terminal from the project root, never by an agent: what it removes (the plugins and marketplace, the settings entries, the `CLAUDE.md` block, the `.gitignore` line, `.picket/config.json`, `.picket/state/`), that it asks per group and keeps `work/` unless you choose it or pass `--remove-work`, `--dry-run`, `--yes` (needed outside a terminal), that a linked `.picket` or `.claude` folder is left alone, and the two machine-level commands it prints (`picket style remove --all`, `npm uninstall -g @picketai/picket`). The quick reference keeps the replies and slash commands, lists the daily verbs (`picket next`, `picket list`, `picket cost`, `picket style apply`, `picket uninstall`), and links `reference/cli.md` for every other verb.

**Done when:**
- **T-3.1** "Before you start" says Node.js 22 or later, and no "Node.js 20" remains.
- **T-3.2** The how-to's lanes table names `lanes.fast.max_files`, `lanes.order.max_phases`, `lanes.order.max_decisions`, `lanes.design.max_phases` and `lanes.design.max_decisions` with the defaults 3, 3, 5, 10 and 8, and it is the only table with a `| Lane |` header in `README.md`, `docs/how-to.md` and `docs/reference/`.
- **T-3.3** "Updating" gives the `picket: "new" is now "open"` example, which `node dist/bin/picket.mjs new` prints, and links `../CHANGELOG.md`.
- **T-3.4** "Removing Picket from a project" covers `--dry-run`, `--yes`, `--remove-work`, the kept `work/`, linked folders and the two printed commands, and no `claude plugin uninstall` command remains in the how-to.
- **T-3.5** The quick reference links `reference/cli.md`, and every `picket` command and `/picket:` name in the how-to passes the names and slash command checks.
- **T-3.6** `npm test` exits 0.

## Phase 4: CONTRIBUTING and the hooks README

**Touch set:**
- `CONTRIBUTING.md`: sections per D-007
- `src/lib/hooks/README.md`: deleted; the block lists it
- `artifacts/refactor/00-conventions.md`, `scripts/test.mjs`, `.github/workflows/release.yml`: read only, what the rules state
- `test/repo/markdown-paths.test.mjs`: `ELSEWHERE` only if an entry is left uncited [INFERRED]

**Changes:** Per D-007. Rewrite `CONTRIBUTING.md` in the D-007 section order. Layout replaces the pointer to the README's folder map with the layout under `src/` (lists, one folder per entry, `shared/` and `util/`, the import direction, tests beside the code). Building and testing covers `npm run build`, `npm run watch`, `npm run typecheck`, `npm test` and its steps as `scripts/test.mjs` runs them, `npm run docs`, staging the regenerated `docs/reference/` pages, and Node 24 for contributors against Node 22 for users. Installing from a checkout keeps `npm run claude` and the `init` command, and replaces the undo-by-hand paragraph with `picket uninstall`. Code conventions states C-001 to C-019 as rules, each one sentence or two ending with its id in parentheses, grouped under short subheadings, keeps the foundation modules list, and names `artifacts/refactor/00-conventions.md` as the record of why. Hooks takes the authoring text of `src/lib/hooks/README.md` (the kinds, naming all eight prefixes where the README's line 3 names six, folder and `HookSpec`, `run-hook.mts`, exit 0 on failure, the 200 ms cold budget, the bundle per hook, `node dist/hooks/<hook>.mjs < payload.json`, where tests sit) and links `docs/reference/hooks.md` for the list. Releasing gains the step that drops "(not released yet)" from the newest `CHANGELOG.md` heading before `npm version`. Delete `src/lib/hooks/README.md`.

**Done when:**
- **T-4.1** `src/lib/hooks/README.md` does not exist, `git ls-files src/lib/hooks/README.md` prints nothing, and after `npm run build` no `dist/lib/hooks/README.md` exists.
- **T-4.2** `CONTRIBUTING.md` has the sections Layout, Building and testing, Installing from a checkout, Code conventions, Hooks, Markdown, Commits, Releasing and Folders outside the product, in that order, no sentence sends the reader to the README for the folder map, and Hooks names all eight kind prefixes.
- **T-4.3** Code conventions holds one rule for each of C-001 to C-019, each ending with its id in parentheses, and names `artifacts/refactor/00-conventions.md` as the reasoning.
- **T-4.4** Installing from a checkout names `picket uninstall` and no `claude plugin uninstall` or `claude plugin marketplace remove` command remains.
- **T-4.5** Building and testing names `npm run docs` and staging the pages, and Releasing names the changelog heading step.
- **T-4.6** `npm test` exits 0, the markdown path test included.

## Open questions

- **OQ-001** Is the refactor's release 1.0.0-alpha.4? Owner: the user, at release. Fallback: the heading reads `1.0.0-alpha.4 (not released yet)`, and the release step in `CONTRIBUTING.md` renames it.
- **OQ-002** If writing the pages pushes `npm run build` past 2 s (RISK-002), should the build stop writing them and leave that to `npm run docs` and the staleness test? Owner: the lead, with the user. Fallback: the developer stops phase 1 with both timings.

## Revision log
- 2026-10-24: D-002 (r2): hooks page kinds paragraph adds `route` and `notify`; T-1.3 checks all eight prefixes (cross-check Minor).
- 2026-10-24: D-007 (r2): section list names Folders outside the product, matching T-4.2; Hooks section names all eight kinds (cross-check Minor).
