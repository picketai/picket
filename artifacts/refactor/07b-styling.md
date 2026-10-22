# 07b: Terminal styling, and removing Picket

Status: approved (2026-10-22).

The styling code (`core/lib/styling/`, 2030 lines in 18 files) already plans before it applies, records what it installed in a manifest, and reaches the machine only through a `host` object. This item gives its components and terminals the list-and-folder structure verbs, hooks and mods have, replaces the hidden `run.fontSet` channel with a fact the manifest records (fixes B6), builds every manifest entry one way, and folds `setup-terminal` and the old `uninstall` into the group verb `style apply` and `style remove`. A new `picket uninstall` removes Picket from a project: everything `picket init` adds, from one shared list.

## Today

### Structure

Two lists live in code: `COMPONENTS = [theme, fontComponent(), terminalComponent(), statuslineSetting]` (`setup.mjs:8`) and `WRITERS` (`terminal.mjs:14`), picked by an `if` chain over environment variables (`detectTerminal`, `:16-23`).

### B6: the font flag

A terminal writer that sets the font must set `run.fontSet = true` inside its `apply`, and the icons step checks the flag (`terminal.mjs:57`: `if (!(fontSetBefore || run.fontSet) || ...) return null`). The writers that do: `konsole.mjs:63`, `gnome-terminal.mjs:143`, `ptyxis.mjs:109`, `windows-terminal.mjs:134`. `terminal-app.mjs:119` declares `setsFont: true` and never sets the flag, so on macOS the status line never switches to Nerd Font icons (reproduced in the periphery audit with a fake macOS host: the profile and default changes applied, then `statusline-icons` came back "skipped, not needed after the earlier changes"). The fallback `fontSetBefore` (`terminal.mjs:47`) reads `item.data?.setsFont`, which no writer records, so it is never true.

### Copies

- Manifest entries are built by hand in 10 places: `font.mjs:168`, `statusline-setting.mjs:56`, `terminal.mjs:70`, `theme.mjs:73,105`, `terminals/gnome-terminal.mjs:83`, `terminals/ini.mjs:88`, `terminals/konsole.mjs:73`, `terminals/terminal-app.mjs:91`, `terminals/windows-terminal.mjs:75`; most repeat back up, create the folder, write, hash.
- `terminals/ptyxis.mjs:4-18` imports 13 dconf helpers from `terminals/gnome-terminal.mjs`.
- `terminals/ini.mjs` mixes INI reading and writing with Picket's `keyfileChange`; `zip.mjs` and `terminals/plist.mjs` know nothing about Picket.

### Two verbs for one job

`setup-terminal --revert` removes every styling item (`setup.mjs:124`); `uninstall` lists them and asks which (`uninstall.mjs`), then prints how to remove Picket itself. Both call `removeChosen`. Nothing removes Picket from a project: the user undoes `init` by hand.

### What `init` adds to a project

Run with `--no-install` on a sample project (`CLAUDE.md` with `# My project`, a `settings.json` allowing `Bash(npm test)`):

```
claude-md: updated   .../CLAUDE.md
config: created      .../.picket/config.json
gitignore: created   .../.gitignore
settings: updated    .../.claude/settings.json · statusLine already set in ~/.claude/settings.json
marketplace, plugin, status, markdown: skipped
```

`settings.json` after it:

```json
{
  "permissions": {
    "allow": ["Bash(npm test)", "Bash(picket *)", "PowerShell(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"],
    "ask": ["PowerShell(picket drive *)", "PowerShell(picket check *)"]
  },
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
}
```

The keys, rules, line and plugin ids are constants spread over `init.mjs:7-21`.

## Target

### Lists and folders

```
src/lib/shared/styling/
  components.mts               the component list: theme, font, terminal, statusline
  terminals.mts                the terminal list, detection as data
  components/
    theme/index.mts  font/index.mts  terminal/index.mts  statusline/index.mts
  terminals/
    windows-terminal/index.mts  terminal-app/index.mts  konsole/index.mts
    gnome-terminal/index.mts  ptyxis/index.mts  manual/index.mts
    dconf.mts                  shared by gnome-terminal and ptyxis
    keyfile.mts                keyfileChange, keptFile
  plan.mts                     plan, confirm, apply, record (today's setup.mjs runner)
  manifest.mts                 read, write, remove; manifestItem, writeTracked
  host.mts  palette.mts
src/lib/shared/install.mts     what init adds to a project, one list for init and uninstall
src/lib/util/
  ini.mts  plist.mts  zip.mts  file formats, no Picket knowledge
src/lib/verbs/
  style/index.mts  apply.mts  remove.mts
  init/index.mts
  uninstall/index.mts
```

```ts
// src/lib/shared/styling/terminals.mts
export const TERMINALS = {
  "windows-terminal": { name: "Windows Terminal", detect: { env: "WT_SESSION" } },
  "terminal-app":     { name: "Terminal.app",     detect: { env: "TERM_PROGRAM", equals: "Apple_Terminal" } },
  konsole:            { name: "Konsole",          detect: { env: "KONSOLE_VERSION" } },
  ptyxis:             { name: "Ptyxis",           detect: { env: "PTYXIS_VERSION" } },
  "gnome-terminal":   { name: "GNOME Terminal",   detect: { env: ["GNOME_TERMINAL_SCREEN", "GNOME_TERMINAL_SERVICE"] } },
} as const;

export function detectTerminal(env: NodeJS.ProcessEnv): TerminalId | "other"     // walks the list in order
```

```ts
// src/lib/shared/styling/terminals/konsole/index.mts
export const writer: TerminalWriter = {
  plan: (host, manifest, { family }) => [colorschemeChange(host), profileChange(host, family), defaultChange(host)],
  unapply: (item, host) => ...,
};
```

A terminal is an entry in `TERMINALS` plus a folder whose `index.mts` exports `writer`; `tsc` rejects an entry without one. Components follow the same shape with `components.mts` and `component`.

### B6: the manifest records the font

```ts
// src/lib/shared/styling/manifest.mts
export function manifestItem(host: Host, change: Change, fields: ItemFields): ManifestItem {
  return { id: change.id, component: change.component, ...fields, ...(change.setsFont ? { setsFont: true } : {}), installedAt: installedAt(host) };
}

export function writeTracked(host: Host, path: string, content: string, backup: Backup): Pick<ManifestItem, "kind" | "path" | "backup" | "sha256">
```

The runner records every applied item through `manifestItem`, so `setsFont` comes from the change's declaration and no writer remembers a flag. The icons step reads what was applied:

```ts
const fontApplied = (manifest: Manifest, applied: ManifestItem[]) => [...manifest.items, ...applied].some((item) => item.setsFont);
```

`run.fontSet` goes; `fontSetBefore` becomes the real check because items now carry `setsFont`. Terminal.app needs no change. The 10 hand-built entries go through `manifestItem` and `writeTracked`.

### `style apply` and `style remove`

| Today | Target |
|---|---|
| `picket setup-terminal [--theme-only] [--font-only] ... [--dry-run] [--yes]` | `picket style apply [--only theme,font] [--dry-run] [--yes]` |
| `picket setup-terminal --revert` | `picket style remove --all` |
| `picket uninstall` (choose styling items) | `picket style remove` (choose items) |

`host.mts` builds the `Host` from the verb's `Context`; nothing in styling reads `process` (C-007).

### `picket uninstall`: Picket out of the project

```ts
// src/lib/shared/install.mts
export const INSTALL = {
  claudeMd: { start: "# Picket", template: "templates/claude-block.md", projectFacts: "## Project facts" },
  config: ".picket/config.json",
  gitignore: ".picket/state/",
  settings: {
    env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    allow: ["Bash(picket *)", "PowerShell(picket *)", "Read(~/.claude/plugins/cache/picketai/**)"],
    ask: ["PowerShell(picket drive *)", "PowerShell(picket check *)"],
    statusLine: { type: "command", command: "picket statusline" },
  },
  marketplace: "picketai",
  plugins: ["picket@picketai"],          // mods come from MODS (07a), by their install field
} as const;
```

`init` adds what `INSTALL` lists; `uninstall` removes exactly that:

| `init` adds | `uninstall` |
|---|---|
| the Picket block in `CLAUDE.md` | removes it and the blank line before it; deletes the file if only an empty `## Project facts` is left |
| `.picket/config.json` | removes it; asks first if `.picket/extensions/` holds an extension |
| `.picket/state/` in `.gitignore` | removes the line; deletes the file if it is then empty |
| the `env` key, the `allow` and `ask` rules, and `statusLine` when it equals Picket's | removes those entries only; drops a list or object it leaves empty; the user's own rules stay |
| the marketplace `picketai` | `claude plugin marketplace remove picketai --scope project` |
| `picket@picketai` and each installed mod | `claude plugin uninstall <id> --scope project` |
| `.picket/state/` | removes it |
| (`work/`, the project's work items) | offered in the list, unchosen by default |

It shows the plan, asks per group, and takes `--yes` and `--dry-run`, like `style remove`. It then prints the machine-level steps instead of running them:

```
Picket is removed from this project.
Also on this machine, if you want them gone:
  picket style remove --all          the theme, font and terminal scheme
  npm uninstall -g @picketai/picket  the picket command
```

## Evidence (2026-10-22)

- B6: the writers that set `run.fontSet` (`grep run.fontSet`): `gnome-terminal.mjs:143`, `konsole.mjs:63`, `ptyxis.mjs:109`, `windows-terminal.mjs:134`; `terminal-app.mjs` has `setsFont: true` at `:119` and no `run.fontSet`.
- The 10 manifest entries, found by `installedAt(host)` and the private `item()` helpers, as listed above.
- `claude plugin uninstall --help`: `-s, --scope <scope>  Uninstall from scope: user, project, or local`. `claude plugin marketplace remove --help`: `--scope <scope>  Remove the marketplace declaration from a specific settings scope: user, project, or local`.
- `init` on a sample project, as shown above: it rewrites `settings.json` with two-space JSON and appends `env` after `permissions`, so a round trip can restore the content of `settings.json` but not its original formatting.

## Decisions

### Y-1: Components and terminals are lists with one folder each
`components.mts` and `terminals.mts`; detection is data; `plan.mts` is the runner.

### Y-2: The manifest records `setsFont` (fixes B6)
Through `manifestItem` from the change's declaration; `run.fontSet` and the dead fallback go.

### Y-3: `manifestItem` and `writeTracked` build every manifest entry
The 10 hand-built entries go.

### Y-4: `dconf.mts` is shared by GNOME Terminal and Ptyxis
No writer imports another writer.

### Y-5: `ini`, `plist` and `zip` move to `util/`
`keyfileChange` and `keptFile` stay in styling as `keyfile.mts`.

### Y-6: `style apply` and `style remove`
`setup-terminal`, its `--revert` and the old `uninstall` fold into the group verb; `--<x>-only` flags become `--only a,b`. Approved by the user on 2026-10-22.

### Y-7: Styling reads the machine only through `Host`
Built from the `Context` by the `style` verbs.

### Y-8: `picket uninstall` removes Picket from the project
Everything `init` adds, read from `shared/install.mts`, which `init` also reads; `work/` offered unchosen by default; extensions asked about; machine-level steps printed, not run. Chosen by the user on 2026-10-22.

## Migration

### Phase 1: styling
- `shared/styling/` lists and folders; `manifestItem`, `writeTracked`; `dconf.mts`, `keyfile.mts`; `util/ini.mts`, `plist.mts`, `zip.mts`.
- Tests: a fake macOS host with the font present ends with `statusline-icons` applied (B6); every component and terminal test under `test/kernel/styling/` passes unchanged in substance, moved beside its code (C-017); the manifest written by today's code still reads and removes (old manifests carry no `setsFont`, which only affects the icons step's view of past runs).
- `verbs/style/` with `apply` and `remove`; the renames in docs (`README.md:34,35,62`, `docs/how-to.md:267-321`, `docs/setup-terminal-checklist.md`, renamed `docs/style-checklist.md`).

### Phase 2: install and uninstall
- `shared/install.mts`; `init` reads it, with its output unchanged.
- `verbs/uninstall/`; a round-trip test: on a sample project, `init --no-install` then `uninstall --yes` leaves `CLAUDE.md` and `.gitignore` byte for byte as before, `settings.json` equal as JSON, `.picket/` gone and `work/` untouched; with a fake `claude` runner, the marketplace and plugin removals are called with `--scope project`.
- `docs/how-to.md`'s removal section describes `picket uninstall`.

## Risks

- R-1: manifests written before this change have no `setsFont`; on such a machine, a font set in an earlier run counts as not set, so the icons step may ask to run again. Running `style apply` once records it.
- R-2: `uninstall` edits `settings.json`, which may hold the user's own rules next to Picket's. It removes only exact strings from `INSTALL`, and `--dry-run` shows each removal first.
- R-3: `settings.json` comes back equal in content but formatted by `JSON.stringify`, as `init` already formats it.
- R-4: `uninstall` cannot remove the global `picket` command it runs from; it prints the command instead.

## Affects

- 01: `docs/setup-terminal-checklist.md` renames; the build has nothing new here.
- 03: verbs `style` (group: `apply`, `remove`) and `uninstall` (new); `setup-terminal` and the old `uninstall` go from the X-8 table's targets.
- 04d: `statusline` reads `palette.mts` from `shared/styling/`.
- 07a: mods' install list comes from `MODS`, which `install.mts` and `uninstall` both read.
- 08: docs for `style` and `uninstall`.

## Open questions

None.
