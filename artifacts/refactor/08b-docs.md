# 08b: Docs

Status: approved (2026-10-22).

Each document gets one job, the lanes are described once, and the three references that only list things (verbs, hooks, mods) are generated from the lists items 03, 05 and 07a introduced, committed, and checked for staleness. The README's Status section becomes `CHANGELOG.md`, which gets an entry collecting every change a user will notice from this refactor. `CONTRIBUTING.md` describes the new layout and states the conventions as rules.

## Today

| File | Lines | Holds |
|---|---|---|
| `README.md` | 107 | intro, a lanes table, a 30-line layout of `core/`, benchmarks, a Status section that is a changelog (alpha.1 changes, the 2026-09-14 comparison, "since that run"), the comparison with agent-skills and pstack, the maintainer note |
| `docs/how-to.md` | 378 | install, the daily loop with a second lanes table, configuration, extensions, styling, notifications, updating, removal, troubleshooting, a quick reference |
| `docs/skills.md` | 159 | a table of the 17 skills and one section each, by hand |
| `docs/agents.md` | 44 | a table of the 4 agents and one section each, by hand |
| `core/hooks/README.md` | 28 | a table of the 14 hooks, by hand |
| `CONTRIBUTING.md` | 67 | where things go in `core/`, installing from a checkout (and undoing `init` by hand), code conventions |
| `docs/setup-terminal-checklist.md` | 56 | the manual styling checklist |

- The lanes are described three times: `README.md:13-18` ("at most 3 files, no new surface, dependency, security path or migration"), `docs/how-to.md:100-105` ("at most 3 files, nothing new to design, no security path or migration"), and the four lane sections of `docs/skills.md`. The 3 is a config value, `lanes.fast.max_files`.
- The skills, agents and hooks tables and the how-to quick reference are lists by hand; nothing checks a skill has a section or a hook in `hooks.json` has a row.
- The Status section grows each release.
- No changelog exists; `.github/scripts/release.mjs` and `release.yml` read no release notes.
- Old names the refactor changes, counted in `README.md`, `CONTRIBUTING.md`, `docs/*.md`, and `core/skills`, `core/agents`, `core/rules`: `picket setup-terminal` 14, `picket uninstall` 8 (its meaning changes), `picket new` 6, `picket pr` 3, `picket review-summary` 1, `picket extensions` 1, `picket extension new` 1. Paths under `core/` appear throughout `README.md` and `CONTRIBUTING.md`.

## Target

### One job per document

| Document | Owns | Points to |
|---|---|---|
| `README.md` | what Picket is and why, one line per lane, a short layout of `src/` and `dist/`, benchmarks, the comparison, the maintainer note | the how-to, `docs/reference/`, `CHANGELOG.md` |
| `docs/how-to.md` | everything a user does; the one lanes table | `docs/reference/` for details |
| `docs/reference/skills.md`, `agents.md` | one section per skill or agent, by hand | the how-to for lanes |
| `docs/reference/cli.md`, `hooks.md`, `mods.md` | generated from the lists | |
| `docs/style-checklist.md` | the manual styling checklist (renamed, 07b) | |
| `CHANGELOG.md` | changes per release; today's Status section moves here unchanged | |
| `CONTRIBUTING.md` | building, testing, the layout under `src/`, the code conventions as rules | `artifacts/refactor/` for the reasoning |

Lane limits name their config key: "a few files (`lanes.fast.max_files`, 3 by default)".

### Generated references

```
docs/reference/cli.md     from VERB_NAMES and each verb's usage and summary (item 03)
docs/reference/hooks.md   from HOOKS: name, events, matcher, summary (item 05)
docs/reference/mods.md    from MODS: plugin, description, default or opt-in (item 07a)
```

Each list entry gains a one-line `summary`; `picket help` prints the same text. `scripts/docs.mjs` writes the three pages; `npm run docs` runs it; the build runs it too. The pages are committed, as the user chose on 2026-10-22, and a test regenerates them in memory and fails when a committed page differs, naming the command to run. `core/hooks/README.md` goes.

A generated entry:

```markdown
### picket leave
Record cleanup a work item leaves for you; `picket close` lists it.

    picket leave <id> --command "<command>" [--why "<why>"]
```

```markdown
| Hook | Events | Matcher | Does |
|---|---|---|---|
| `guard.bash` | PreToolUse | `Bash\|PowerShell` | Allows read-only commands, denies destructive ones, and leaves the rest to the permission prompt |
```

### Checks on the hand-written pages

- Every skill folder except `shared/` has a `## picket:<name>` section in `docs/reference/skills.md`, and every such section has a folder; the same for agents and `agents.md`.
- Every `picket <verb>` in `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`'s newest entry and `docs/**` names a verb in `VERB_NAMES` (the 08a check, widened; older changelog entries keep their historical names).
- The how-to quick reference names only existing verbs and slash commands.
- No em or en dash in any of these files (08a, check 4).

### `CHANGELOG.md`

Newest release first, one section per version. The release that ships this refactor:

```markdown
## 1.0.0-alpha.N

### Changed, act on these
- Picket needs Node 22 or newer.
- Renamed: `new` is now `open`, `review-summary` is `summary`, `setup-terminal` is `style apply`
  (`--revert` is `style remove --all`), `pr <url>` is `pullrequest prepare <url>` and
  `pr <url> --post <f>` is `pullrequest post <url> --file <f>`, `extensions` is `extension list`,
  `extension new` is `extension add`. `find-verdict` is removed.
- `picket uninstall` now removes Picket from the project; the old styling removal is `picket style remove`.
- A refusal exits 2 with `{ "ok": false, "error": ... }`, including `leave` on a closed item,
  `source pick` with an unknown label, `source grep` with an invalid regex, an undeclared source,
  and a destructive command given to `check` or `drive`.
- Security paths: `src/payments/**` now also sends `admit` to the design lane; `src/pay` no longer
  matches `src/payment-ui/`; `Authentication/` and `Authorization/` match at any depth.
- The Bash guard now asks before `find -fprint`, `find -fls`, `tree -o`, `rg --pre` and
  `git log|diff|show --output`, and before project tools such as `vitest`, `tsc`, `eslint` and `prettier`.
- A source whose name is not letters, digits, `_` or `-` is ignored with a warning.

### Fixed
- Drive evidence goes to the work item `picket next --latest` names.
- A malformed `package.json` warns instead of crashing `check`, `drive`, `verify`, `mutate` and `preflight`.
- A folder with only a `.sln` or `.slnx` file counts as .NET.
- One unreadable line in `verdicts.jsonl` no longer breaks the item.
- Terminal.app switches the status line to Nerd Font icons.
- YAML front matter: a trailing `# comment` and an inline `{...}` map read correctly; unsupported YAML fails with a line number.

### Added
- `picket uninstall`; `style remove`; `[i] confirm the irreversible step` at an irreversible gate;
  the stall options in `picket next`.
```

### `README.md`

The lanes table becomes four lines that link to the how-to's table; the layout shrinks to the top level of `src/` and `dist/` (the generated references carry the details); Status moves to `CHANGELOG.md`, and the README links to it. The comparison and the maintainer note stay.

### `docs/how-to.md`

Same order. Changes: Node 22 under "Before you start"; the renames; "Terminal styling" around `style apply` and `style remove`; "Removing Picket from a project" around `picket uninstall` (07b), including what it keeps (`work/` unless chosen) and the two machine-level commands it prints; the quick reference lists the daily verbs and links `reference/cli.md` for the rest.

### `CONTRIBUTING.md`

Rewritten sections: the layout (`src/` builds `dist/`; verbs, hooks and mods each a list plus one folder per entry; `shared/`, `util/` and the import direction; tests beside the code); building and testing (`npm run build`, `npm test`, `npm run watch`, Node 24); installing from a checkout (`npm run claude`; `picket uninstall` replaces the undo-by-hand paragraph); the code conventions, written as rules from `00-conventions.md` (C-001 to C-019), which stays as the record of why.

## Decisions

### G-1: One job per document
As in the table; one lanes table, in the how-to; lane limits name their config key.

### G-2: `cli.md`, `hooks.md` and `mods.md` are generated and committed
From the lists, each entry with a `summary`; a staleness test; `core/hooks/README.md` goes. The user chose committing them on 2026-10-22.

### G-3: `skills.md` and `agents.md` stay hand-written, under tests
Every skill and agent has a section and every section a folder.

### G-4: `CHANGELOG.md`
Today's Status section moves there; the refactor's release gets the entry above.

### G-5: References live in `docs/reference/`

### G-6: `CONTRIBUTING.md` states the new layout and the conventions as rules
`artifacts/refactor/00-conventions.md` stays as the reasoning.

### G-7: Docs name only existing verbs
The 08a verb check covers `README.md`, `CONTRIBUTING.md`, the newest changelog entry and `docs/**`.

## Migration

Docs land with the code they describe, not before: each item's migration updates the pages it changes, and this item adds the frame.

### Phase 1: the frame
- `docs/reference/` with `skills.md` and `agents.md` moved; `CHANGELOG.md` with the Status section; the README trimmed and linked.
- `scripts/docs.mjs` and `npm run docs`; the staleness test; the section and verb checks.

### Phase 2: with the implementation
- Each list gains `summary`s as its item lands (03 verbs, 05 hooks, 07a mods); the generated pages appear with them.
- Each item's migration updates the how-to, `CONTRIBUTING.md` and the README for what it changes; the changelog entry grows item by item.

## Risks

- R-1: the generated pages can be forgotten in a commit; the staleness test fails `npm test` and names `npm run docs`.
- R-2: the verb check on `CHANGELOG.md` would fail on old entries that name old verbs; it reads only the newest entry.
- R-3: relative links from the README into `docs/` render on GitHub, and npm renders them against the `repository` field; the docs are not in the package's `files` list, so a reader of the installed package follows the links to GitHub.

## Affects

- 03, 05, 07a: each list entry gains `summary`.
- 07b: `docs/setup-terminal-checklist.md` becomes `docs/style-checklist.md`.
- 08a: the dash and verb checks widen to the docs.
- 09: `docs/design/` is reviewed with the other hygiene items.

## Open questions

None.
