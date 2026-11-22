---
icon: lucide/sliders-horizontal
---

# Customization

Picket is customized in two places: the settings file, and extensions that add your own text and checks. Its core (the verdicts, the gates, the guards and the budgets) cannot be changed.

The status line, the panes, the terminal styling and the notifications are in [Look and notifications](look.md).

## Settings

All settings live in `.picket/config.json`. Every key is optional.

``` json
{
  "version": 1,
  "security_paths": ["src/payments/", "infra/iam/"],
  "commands": { "test": "npm test", "lint": "npm run lint" },
  "lanes": { "fast": { "max_files": 3 }, "order": { "max_phases": 3, "max_decisions": 5 } },
  "sources": { "specs": { "env": "PICKET_SOURCE_SPECS" } },
  "extensions": ["house-style"],
  "quality": { "coverage_min": 85, "max_warnings": 0 }
}
```

| Key | What it changes |
|---|---|
| `security_paths` | adds to the built-in list (`src/auth/`, `src/crypto/`, `src/security/`, `Authentication/`, `Authorization/`). A change under any of them always takes the design lane, every such phase takes its own approval, and the reviewer loads the full security checklist. |
| `commands` | overrides detection of your test, lint, build and run commands. Picket detects the usual ones (`npm test`, `dotnet test`, `pytest` and so on); set them here when it guesses wrong. A destructive command is dropped with a warning. |
| `lanes` | changes the caps that decide when work moves to a heavier lane. |
| `sources` | declares read-only repositories outside the project, such as a specification repository. |
| `extensions` | enables and orders your [extensions](#extensions). |
| `quality` | records the bar your checks must hold: `coverage_min` (0 to 100) and `max_warnings` (0 or more). |
| `testing` | decides which finished items the tester checks after the final review: `design` (the default), `all` or `off`. The environment it needs is built in [How to set up testing](set-up-testing.md). |
| `mods` | switches off the [Markdown pane](look.md#the-markdown-pane) or the [work pane](look.md#the-work-pane). |
| `data_targets` | lists the servers and databases each data service may reach; `picket data run` refuses a connection that is not on its service's list. |

`init` also keeps `picket_version` in this file: the Picket version that last refreshed the project. Leave it to `init`.

??? note "Sources in detail"

    Each source names an environment variable that holds the folder on this machine, so the path stays out of git. Set the variable in the `env` block of `.claude/settings.local.json`:

    ``` json
    { "env": { "PICKET_SOURCE_SPECS": "D:/code/bookshop-specs" } }
    ```

    Agents read a source with `picket source find specs <name>` and `picket source grep specs <regex>`, and nothing ever writes to it.

??? note "The quality bar in detail"

    A hook denies any edit that makes a known threshold weaker, either than its value before the edit or than this bar. Example: with `coverage_min: 85`, writing `lines: 80` in `vitest.config.ts` is denied, and so is changing `--max-warnings 0` to `--max-warnings 5` in `package.json`. The same hook denies a new suppression (`eslint-disable`, `@ts-ignore`, `noqa`) and a new skipped or focused test. When you accept one, reply `w <n>` to the proposal on the block's `Waivers:` line.

??? note "Testing in detail"

    `design` tests design items, `all` tests order and design items, and `off` tests none. An item is tested only when its plan declares a check against an HTTP endpoint and the project has a test environment in `.picket/env/compose.yaml`. The tester runs cases on the item's own stack without reading the change, and the kernel derives its verdict. The closing block's `Tested:` line says what came of it: `APPROVED in round 2 · 5 passed, 1 not covered`, the criteria you accepted as not verified, or why the item was not tested, such as `no environment`. A `Not verified end to end:` line names each real service a mock stood in for.

## Extensions

An extension adds text and checks to Picket without changing its core: rules every agent reads, notes for one role, extra review checklist steps, and preflight checks. Create one with:

``` sh
picket extension add house-style
```

This creates the manifest `.picket/extensions/<name>/extension.json`, here with `house-style` as the name, and enables the extension in the config. List your Markdown files in its `rules`, `agents`, `review_steps` or `preflight` keys. `picket extension list` shows what is loaded.

!!! warning "What an extension cannot do"

    An extension cannot change the verdicts, the gates, the guards or the budgets.
