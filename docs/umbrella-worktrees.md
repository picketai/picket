---
icon: lucide/git-branch
---

# Worktrees in an umbrella

In an umbrella, Picket can make a change to a nested repository in a worktree on a branch you name. This guide covers the one extra gate that sets those worktrees up, and how to remove them.

The layout of an umbrella is in [Configure your project](configure-your-project.md).

## Name the branch

When the project holds nested repositories (folders under `src/` with their own `.git`) and the plan touches one, Claude stops once before the developer starts, at `create_worktrees`:

``` text
▶ worktrees before phase 1 · 20261030-orders-pricing
  the plan touches src/Orders; name the branch for their worktrees before phase 1

  src/Orders from main @1a2b3c4d -> src/Orders/.worktrees/RMS-12

[y] create RMS-12   reply: <name> [from <ref>]   [n] use the main checkouts
```

| Reply | Effect |
|---|---|
| `y` | names the branch after the ticket key; offered only when the item came from a ticket |
| `feature/x from develop` | names the branch `feature/x`, started from `develop` in each touched repository; `from` is optional |
| `n` | no worktrees; the developer works in each repository's main checkout |

## What happens after your reply

1. The developer runs `picket worktree <id>` at every phase, which creates or resumes one worktree per touched repository and hydrates only uninitialised submodules.
2. Plans keep naming `src/Orders/pricing.cs`; `picket verify`, the review summary and the approval map those paths into the worktree.
3. An approval commits the phase in each worktree before the umbrella.

!!! note "A project that allows only `Bash(git add *)`"

    Add an allow rule for `git -C * add *`, since the developer stages inside each worktree.

## Remove the worktrees

When you are done, tear them down:

``` text
/picket:branching --remove <branch>
```
