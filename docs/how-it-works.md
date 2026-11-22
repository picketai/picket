---
icon: lucide/workflow
---

# How Picket works

Picket turns Claude Code into a small, disciplined team. You describe a change in plain words; Picket picks how much process it needs, writes a plan when one is worth having, implements it phase by phase, verifies each phase by running it, and stops for your approval before anything lands in git history.

This page is the picture behind that sentence: the parts, a normal change from your request to the commit, and who talks to whom.

## The parts

<div class="grid cards" markdown>

-   :lucide-user: **The lead**

    ---

    The main Claude Code session, the one you type into. It runs the kernel and sends work to the agents.

-   :lucide-cpu: **The kernel**

    ---

    The `picket` command, which ships inside the plugin. It decides everything that code can decide: which lane a request takes, what the next step is, whether a phase is verified, and how a verdict changes state.

-   :lucide-bot: **The agents**

    ---

    Five teammates with a narrow job each: analyst, architect, developer, reviewer and tester.

    [The agents](reference/agents.md)

-   :lucide-book-open: **The skills**

    ---

    The procedures the lead and the agents follow, one for each lane and one for each job.

    [The skills](reference/skills.md)

-   :lucide-shield: **The hooks**

    ---

    The guards on every tool call, and the recorders of every verdict.

    [The hooks](reference/hooks.md)

-   :lucide-panel-top: **The mods**

    ---

    The status band above the prompt, the work pane (`/picket-session`) and the Markdown pane (`/picket-markdown`).

    [The mods](reference/mods.md)

</div>

## From a request to a commit

The diagram follows one change through the design lane, the lane with every step in it.

``` mermaid
sequenceDiagram
    autonumber
    actor You
    participant Lead as Lead (main session)
    participant Kernel as Kernel (picket)
    participant Architect
    participant Developer
    participant Reviewer
    participant Tester

    You->>Lead: a change request in plain words
    Lead->>Kernel: picket admit
    Kernel-->>Lead: lane design
    Note over Lead: loads the lane skill picket:designing
    Lead->>Kernel: picket open, then picket next
    Kernel-->>Lead: the message for the architect
    Lead->>Architect: write the plan
    Architect-->>Lead: ARTIFACT WRITTEN
    par phase 1 starts
        Lead->>Developer: implement phase 1
    and the plan is checked
        Lead->>Reviewer: check the plan against its decisions
        Reviewer-->>Lead: ALIGNED
    end
    loop every phase
        Developer->>Kernel: picket check, picket verify
        Developer-->>Lead: PHASE DONE, staged
        Lead->>You: the gate packet
        You->>Lead: approve, run on or reject
        Lead->>Kernel: picket reply
        Note over Kernel: commits an approved phase
        Lead->>Developer: the next phase
    end
    Lead->>Reviewer: a fresh reviewer reviews the whole change
    Reviewer-->>Lead: APPROVED
    opt the project has a test environment
        Lead->>Tester: test the finished item from the outside
        Tester->>Kernel: picket test case, picket test report
        Kernel-->>Tester: the verdict it derived
        Tester-->>Lead: APPROVED
    end
    Lead->>Kernel: picket close
    Lead->>You: the closing block
```

!!! tip "Three things hold in every lane"

    - **You are asked at gates, and only there.** Between two gates the work runs without you.
    - **Nothing is committed without your reply.** An agent stages its work; your approval is what commits it.
    - **The kernel decides the next step.** The lead asks `picket next` and sends what it prints, word for word.

## Who talks to whom

The agents never talk to each other. Each one gets its message from the lead, does its job in its own context, and ends with one verdict on its last line.

``` mermaid
flowchart LR
    You([You]) <-->|requests and gate replies| Lead[The lead]
    Lead <-->|admit, next, reply, close| Kernel{{The kernel}}
    Lead <-->|a message out, a verdict back| Agents[The agents]
    Kernel <-->|state and verdicts| Work[(The work item folder)]
    Agents <-->|the plan, the report| Work
```

What one agent needs from another travels through files, not through conversation. The architect writes the plan to `work/<id>/`, the developer reads the plan from there, and the reviewer of the whole change reads your original request before the plan. That is why you can close Claude Code in the middle of a change and [come back](how-to.md#leaving-and-coming-back) with nothing lost.

A hook records each verdict in the work item, and the kernel reads it to decide what comes next.
