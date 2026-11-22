---
icon: lucide/trash-2
---

# How to uninstall

`uninstall` removes Picket from one project and asks before each part it takes away. Your own settings, your text in `CLAUDE.md` and, unless you say otherwise, the history of your work items stay.

!!! warning "Run it yourself"

    Run `uninstall` in a terminal, from the project root. Agents are never allowed to run it.

## Remove Picket from a project

Look at the plan first, then run it:

``` sh
cd ~/code/bookshop
npx @picketai/picket@alpha uninstall --dry-run
npx @picketai/picket@alpha uninstall
```

`--dry-run` prints the plan and changes nothing. Without it, `uninstall` shows each group and asks whether to remove it.

## What it removes

It removes what `init` added, in groups:

1. The Picket plugin and any retired mod plugin still enabled, from the project scope.
2. Picket's entries in `.claude/settings.json`: its permission and ask rules, its `env` key, its status line and the `picketai` marketplace entry. Your own entries stay.
3. The Picket block in `CLAUDE.md`. Your own text stays.
4. The `.picket/state/` line in `.gitignore`.
5. `.picket/config.json`, and your extensions in `.picket/extensions/<name>/` when you choose them.
6. The `.picket/state/` folder.
7. `work/`, the history of your work items.

## What it keeps unless you ask

| Kept by default | To remove it |
|---|---|
| `work/` | answer yes for it, or pass `--remove-work` |
| `.picket/config.json`, when you have an extension in `.picket/extensions/<name>/` | answer yes for it |

`--yes` removes the groups chosen by default without asking. Outside a terminal, through Claude Code's `!` prefix for example, `uninstall` changes nothing unless you pass it.

!!! note "Links and the home folder"

    When `.picket` or `.claude` is a link to a folder outside the project, `uninstall` leaves everything behind that link alone and says so. It also refuses to run in your home folder.

## What stays on your machine

Two things live on your machine rather than in the project, so `uninstall` does not remove them. After a full removal (every group removed, `work/` kept or not), its text output names the commands for them:

``` sh
npx @picketai/picket@alpha style remove --all
npm uninstall -g @picketai/picket
```

The first removes the styling of `picket style apply`. The second removes a global `picket` left from an earlier install; skip it when you never installed one. A copy of the plugin stays in `~/.claude/plugins/cache/picketai/`, marked orphaned, until Claude Code cleans it up.
