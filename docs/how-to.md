---
icon: lucide/repeat
---

# The daily loop

You never pick a process by hand. You type the change you want, Picket picks how much process it needs, and you answer when it stops for you.

This page is the flow in short, for a project where Picket is set up, as [Get started](index.md) shows. Each step links to the page that explains it in full.

## The flow

### 1. Ask for a change

Type the change you want, as you would to a colleague:

``` text
Add a page size option to GET /books, default 20, at most 100.
```

### 2. Picket picks a lane

Claude runs `picket admit` on your words, and the kernel answers with one of four lanes. A plain question takes no lane; Claude just answers it.

``` mermaid
flowchart LR
    R([Your request]) --> Q{A plain question?}
    Q -->|yes| A([Claude answers])
    Q -->|no| K{{picket admit}}
    K -->|a few files, nothing to design| F[fast]
    K -->|a bounded feature| O[order]
    K -->|security, migration, more than an order holds| D[design]
    K -->|needs a report, not a change| S[research]
```

[The four lanes](lanes/index.md) says what each lane is for and how they differ.

### 3. The work item opens

Picket opens a work item for the request. Everything it writes about the change, such as the plan or the report, the state and the verdicts, goes into `work/<id>/`.

### 4. You name the branch

!!! note "Only in an umbrella repository"

    This step happens only when the project is an umbrella and the plan touches one of its nested repositories. In a single repository there is no such step.

Picket stops once, before the developer starts, and asks for the branch that the worktrees will use. [Worktrees in an umbrella](umbrella-worktrees.md) shows the question and your replies.

### 5. The work runs, and stops at gates

The work runs without you until a gate. At a gate you get a short packet that says what was done and how it was checked, with your possible replies on its last line. Nothing is committed until you approve.

[Gates and replies](gates.md) shows a packet and what each reply does.

### 6. The change is reviewed, and tested when it can be

When every phase is approved, a fresh reviewer reviews the whole change against your original request. When the project has a test environment, the tester then checks the finished item from the outside.

[Review and testing](review-and-testing.md) covers both.

### 7. The work item closes

Picket prints a closing block with the commits, the review verdict and what was tested, and the work item is closed.

## Leaving and coming back

Everything about a work item lives in `work/<id>/`, so nothing is lost when you close Claude Code. In a new session:

``` text
/picket:resuming
```

With no id it lists the open work items, and resumes the only one if there is just one. With an id (`/picket:resuming 20261010-csv-export`) it reads the item's state and continues exactly where it stopped, with new agents.

## Status and tokens

``` text
/picket:inspecting
```

It shows every work item with its lane, phase and next step, and the tokens spent, cache hit ratio and stops. `picket list` and `picket cost` show the same numbers; `picket cost` reports tokens per agent, per work item and per phase, not dollars.

When a work item closes, its closing block carries an `Audit:` line (lane, phases, tokens per agent, bounces and blocks), also saved as `work/<id>/audit.txt`.
