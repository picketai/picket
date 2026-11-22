# Diátaxis for the Picket site

Source: https://diataxis.fr (read 2026-11-22: "How to use Diátaxis", the compass, and the pages for the four kinds). Diátaxis is a guide to check a page against, never a plan to fill in.

## The compass

Two questions place any page, paragraph or sentence.

| The content | and serves the reader's | so it is |
|---|---|---|
| informs action | study | a tutorial |
| informs action | work | a how-to guide |
| informs thinking | work | reference |
| informs thinking | study | explanation |

Use it when a page feels hard to write: the difficulty usually means two kinds are mixed.

## Tutorial

A lesson. The reader learns by doing something meaningful towards one goal they can reach, and the writer carries the responsibility for their success.

- Say at the start what we will build: "In this tutorial we will open a work item and take it to a commit." Never "you will learn".
- Every step produces a result the reader can see. Show the expected output, and say what to notice in it.
- Flag the likely wrong turn: "If the output does not show the lane, the plugin is not enabled."
- No choices, no alternatives, almost no explanation. Link to the explanation instead.
- Make steps safe to repeat where the product allows it.

## How-to guide

Directions for a reader who is already at work and knows what they want.

- The title says exactly what the guide shows: "How to update Picket", not "Updating" and not "Updates".
- Written from the reader's goal, not from the tool's features. "How to adopt Picket in an existing codebase" is a guide; "Using the init command" is not.
- Action and only action, in a logical order. No teaching and no reference tables; link to them.
- It may start and end in the middle of the reader's work; it need not be complete end to end.
- It may fork ("if the project is an umbrella repository") where real work forks.

## Reference

A description of the machinery that the reader consults while working.

- Neutral, exact and complete. State facts, list options, give warnings; no instruction and no opinion.
- The structure mirrors the product: one entry per verb, agent, skill, hook or setting.
- Every entry follows the same pattern, so the reader finds things where they expect them.
- A short usage example is welcome; a walkthrough is not.
- Generated reference stays generated, so it cannot drift from the code.

## Explanation

A discussion that gives the reader understanding, read away from the keyboard.

- The title can take "About" in front: "About lanes", "About the test stage".
- Start from a real or imagined why question, and keep to that topic.
- Give context: why it is so, the design decisions, the alternatives rejected. Opinion and trade-offs belong here.
- No steps and no option lists. Those have their own pages.

## How to work

- Take one page, or one paragraph. Ask: what need does it serve, how well, and what single change improves it now? Make that change and publish it.
- Never create empty sections for the four kinds. The structure appears when the pages demand it.
- The site is never finished and always complete: at every stage, what is published is whole and useful.
- When explanation creeps into a how-to guide, or instruction into reference, move it to a page of its own kind and link to it.
