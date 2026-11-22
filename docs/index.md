---
icon: lucide/rocket
---

# Get started

Picket is a software-development workflow for Claude Code. You describe a change in plain words; Picket picks how much process it needs, plans it, implements it phase by phase and stops for your approval before anything lands in git history.

It is one Claude Code plugin, set up once in each project. Nothing is installed globally.

!!! warning "Picket is an alpha"

    It is published on npm under the `alpha` tag, so keep the `@alpha` on every command on this page.

## Installation

!!! note "Prerequisites"

    - Claude Code, recent (the alpha is tested with 2.1.302), signed in.
    - Node.js 22 or later (`node -v`).
    - git, and a project that is a git repository. Picket commits approved work for you, so it needs one.

    Picket has no runtime dependencies; the package is plain Node.

### Set up a project

Run `init` from the root of each project you want to use Picket in.

=== ":material-apple: macOS and :material-linux: Linux"

    ``` sh
    cd ~/code/bookshop
    npx @picketai/picket@alpha init
    ```

=== ":fontawesome-brands-windows: Windows"

    Install [Git for Windows](https://git-scm.com/download/win) first. Claude Code runs its Bash tool through Git Bash, and Picket's command works from Git Bash and PowerShell.

    ``` ps1
    cd C:\code\bookshop
    npx @picketai/picket@alpha init
    ```

npx fetches the package for this one run; nothing stays on your `PATH`. `init` finds the repository root on its own (pass `--root <path>` to choose another folder) and refuses to run in your home folder. Where to run it in a project made of several repositories is in [Configure your project](configure-your-project.md).

??? note "What `init` changes"

    1. Adds the Picket block to `CLAUDE.md`, or creates the file. Your own text stays; put project notes under `## Project facts`, which `init` never touches.
    2. Creates `.picket/config.json` with `{ "version": 1 }`.
    3. Adds `.picket/state/` to `.gitignore`. That folder holds logs and runtime state that never belong in git.
    4. Updates `.claude/settings.json`. It allows `Bash(picket *)` and `PowerShell(picket *)` so the kernel runs without a prompt, and read access to the plugin cache; if your `permissions.deny` already blocks one of them, `init` leaves it out and says so. It adds the ask rules `PowerShell(picket drive *)` and `PowerShell(picket check *)`, because those two run your code. It sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `"1"`. It writes a status line only when you ask for one; see [The status line](customization.md#the-status-line).
    5. Uninstalls the retired plugins picket-status, picket-markdown and picket-session when the project still enables them. Their features are now part of `picket@picketai`.
    6. Writes the marketplace `picketai` into `.claude/settings.json` as `extraKnownMarketplaces.picketai`: a marketplace declared in the settings file itself, whose one plugin, `picket`, comes from the npm package `@picketai/picket` under the `alpha` tag. An older entry for `picketai` (a folder path or a GitHub source) is replaced, and `init` names the old source.
    7. Installs the plugin `picket@picketai` with project scope.

Running `init` again is safe: it changes only what is missing. To write the files and the marketplace entry but skip the `claude` commands, add `--no-install`; it then reports those steps as `skipped`. When an install command fails, `init` reports it as `failed` and prints the command to run by hand: `claude plugin install picket@picketai --scope project`.

!!! warning "An older global install"

    When a `picket` from an earlier global npm install comes before the plugin's on your `PATH`, `init` prints a `WARNING:` line with its path and the command that removes it, `npm uninstall -g @picketai/picket`. The warning never fails `init`.

### Commit the setup

Commit what `init` wrote, so everyone who clones the project gets the same setup:

``` sh
git add CLAUDE.md .gitignore .claude/settings.json .picket/config.json
git commit -m "chore: set up Picket"
```

A teammate who clones the project and opens it in Claude Code is asked to install `picket@picketai` from the committed marketplace; accepting is all the setup they need.

### Check the install

Start Claude Code in the project:

``` sh
claude
```

Run `/plugin` and check that `picket@picketai` is listed and enabled. Then ask for the status:

``` text
/picket:inspecting
```

It lists the work items (none yet). Asking Claude to run `picket list` shows the same from the kernel. If the command is unknown, the plugin is not enabled; see [Troubleshooting](how-to.md#troubleshooting).

## Next steps

- [Configure your project](configure-your-project.md): where Picket goes in a single repository and in an umbrella of repositories.
- [How to use Picket](how-to.md): the daily loop, from a request to a commit.
- [Customization](customization.md): the settings, extensions and look you can change.
