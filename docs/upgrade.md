---
icon: lucide/circle-arrow-up
---

# How to upgrade

Claude Code updates Picket in the background, so an upgrade is two short steps in a session. This page also covers updating by hand and switching background updates off.

## Take a new version

`picket init` turns on `autoUpdate` for the `picketai` marketplace, so a new `alpha` arrives within ten minutes of a session start, unless Claude Code's own auto-updater is off. Claude Code then shows "Plugins changed. Run /reload-plugins to activate."

1. Run `/reload-plugins`, or start a new session.
2. When the session start says ``Picket updated to 1.0.0-alpha.6; run `picket init` to refresh this project.``, run `picket init` in the session. It is safe to repeat: it refreshes the `CLAUDE.md` block, adds any setting the new version needs and records the version in `.picket/config.json`. Commit those files so your teammates are not asked again.

!!! note "When a teammate upgraded first"

    When a teammate already ran `picket init` with a newer Picket, the session start says ``This project uses Picket 1.0.0-alpha.6; run `/plugin update picket@picketai`.``: update the plugin, not the project.

## Update by hand

Run `/plugin update picket@picketai` in the session, or from a terminal:

``` sh
claude plugin update picket@picketai --scope project
```

## Switch background updates off

Set `"autoUpdate": false` on `extraKnownMarketplaces.picketai` in `.claude/settings.json`; `picket init` leaves that value as it is.

## Coming from an older alpha

??? note "From 1.0.0-alpha.5 or earlier"

    In those versions Picket was a global npm install. Run `npx @picketai/picket@alpha init` once in each project, which retires the old mod plugins and points the marketplace at the npm package, then remove the global copy with `npm uninstall -g @picketai/picket`.

??? note "Verbs renamed in 1.0.0-alpha.4"

    Release 1.0.0-alpha.4 renamed six verbs and removed one. An old name still answers with its new one: run the old verb `new` and `picket` prints `picket: "new" is now "open"`. The full list is in the [changelog](https://github.com/picketai/picket/blob/trunk/CHANGELOG.md).
