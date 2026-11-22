---
icon: lucide/scale
---

# How Picket compares

Picket is one of several collections of agent instructions for Claude Code. This page sets it beside two others, agent-skills and pstack, and says where the difference lies and what the comparison is based on.

## The short version

agent-skills and pstack teach the model with prose and checklists that it chooses to follow. Picket enforces the same kind of rule in code, wherever code can decide it.

| | agent-skills | pstack | Picket |
|---|---|---|---|
| Guards on the agent's own tool calls | three optional bash hooks | none | hooks that deny or bounce: destructive commands, kernel-owned files, new comments, silenced checks, malformed blocks |
| How much process a request gets | the model picks a skill | a router skill picks a playbook | `picket admit` picks the lane in code, from the text and the files touched |
| Stops for a human | by convention | by convention | one gate per phase, rendered by code; nothing lands in git without your approval |
| Proof a change works | checklists and an eval of the skills | red-first commit order, verification skills | a drive of the real entry point logged by a hook, and a red or pinning test named on the block |
| Measurement | a trigger and routing check of its skills | none reported | a cost and determinism bench with a regression check, plus labelled lane and skill-routing tests in `npm test` |

## What the others do better

Both comparisons also name what the others do better, and several of those ideas are now in Picket: the untrusted-content rule, the guard against silenced checks, prove before change, the measured lane and routing checks, the design red flags and the repeated-mistake loop.

Others are not in Picket, for example pstack's parallel design and review, and the wider domain guides of agent-skills. The reports list them.

## What this is based on

The table comes from two research reports kept in the repository: [Picket and agent-skills](https://github.com/picketai/picket/blob/trunk/work/20261017-compare-agent-skills-with-picket-skills/research.md) and [Picket and pstack](https://github.com/picketai/picket/blob/trunk/work/20261017-compare-cursor-pstack-with-picket-skills/research.md).

!!! warning "No head-to-head numbers"

    No bench run of agent-skills or pstack exists, so there are no numbers for them. The comparison above comes from reading their sources.

Picket's own numbers come from a tracked file, [the clean comparison](https://github.com/picketai/picket/blob/trunk/bench/results/comparison-clean.md), which measures it against the setup it replaced:

| Measure | Picket | The previous setup |
|---|---|---|
| Tasks passed at the first try | 100% | 93% |
| Tasks that took the intended lane | 100% | 57% |
| Permission prompts per task | 0.4 | 3.1 |
