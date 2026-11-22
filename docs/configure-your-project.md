---
icon: lucide/folder-tree
---

# Configure your project

Picket is set up in one folder, the project root, and keeps everything it writes there. This page shows where that root is for a single repository and for an umbrella of repositories.

!!! note "A guideline, not a standard"

    The layouts below are the ones Picket is built around. Nothing here is enforced beyond what each section says Picket reads.

## Where Picket goes

=== "Single repository"

    The project root is the repository root. Run `init` anywhere inside the repository; it finds the root on its own.

    ``` text
    bookshop/                 the git repository and the project root
    ├─ .claude/settings.json
    ├─ .picket/config.json
    ├─ CLAUDE.md
    ├─ work/                  one folder per work item
    └─ src/                   your code
    ```

    ``` sh
    cd ~/code/bookshop
    npx @picketai/picket@alpha init
    ```

=== "Umbrella repository"

    An umbrella is one git repository that holds your product repositories as folders under `src/`, each with its own `.git`. The project root is the umbrella root, and Picket is set up there once for all of them.

    ``` text
    shop/                     the umbrella repository and the project root
    ├─ .claude/settings.json
    ├─ .picket/config.json
    ├─ CLAUDE.md
    ├─ work/                  one folder per work item, for every repository
    └─ src/
       ├─ Orders/             a product repository with its own .git
       └─ Catalog/            a product repository with its own .git
    ```

    Run `init` from the umbrella root. Inside `src/Orders` it would find that repository's root and set up that repository alone; from anywhere else, pass the umbrella with `--root`.

    ``` sh
    cd ~/code/shop
    npx @picketai/picket@alpha init
    ```

    Picket finds the nested repositories itself: every folder directly under `src/` that holds a `.git` entry. When `.picket/state/branching.yaml` exists, the repositories it lists are used in place of that scan; `/picket:branching` writes the file.

    Plans keep naming files by their path from the umbrella root, such as `src/Orders/pricing.cs`. When a plan touches a nested repository, Picket stops once to ask for a branch name and creates one worktree for each touched repository under that repository's `.worktrees/` folder. An approval commits the phase in each worktree before the umbrella. The steps and the replies are in [Worktrees in an umbrella](umbrella-worktrees.md).

## What lands in your repository

| Path | Tracked | What it holds |
|---|---|---|
| `work/<id>/` | yes | one folder per work item: `state.yaml`, the plan or report, phase markers, the verdicts |
| `.picket/config.json` | yes | project settings; see [Customization](customization.md#settings) |
| `.picket/extensions/<name>/` | yes | your extensions; see [Customization](customization.md#extensions) |
| `.picket/env/compose.yaml` and the folders beside it | yes | the test environment, when you [set up testing](set-up-testing.md) |
| `.picket/state/` | no | logs, the cost ledger, scratch files |
| `CLAUDE.md` | yes | the Picket block plus your project facts |

Agents never commit. The developer stages a phase; your approval runs `picket route`, which commits the staged files together with the work item's state, so every phase is one commit with a message you saw in the packet.

## Project facts

`CLAUDE.md` holds the Picket block, which `init` rewrites on every run. Put what is true of your project alone (how to start it, where the specifications live) under the `## Project facts` heading, which `init` never touches.
