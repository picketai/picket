---
icon: lucide/sprout
---

# How to adopt Picket in an existing codebase

An old codebase has gaps Picket cannot see on day one: modules nobody fully understands, a test suite with holes, and checks that were switched off long ago. This guide closes them in five steps.

Take the steps in order; each one makes the next safer.

## Step 1: Map the code

Before you change a module, ask a question about it:

``` text
how does invoicing compute totals? no code changes
```

The question takes the [research lane](lanes/research.md) and leaves a report under `work/<id>/`. Then test your plan against the project's own words:

``` text
/picket:consulting interview me on <your plan>
```

**What you gain.** You know the module before you touch it, and "invoice", "order" and "bill" mean one thing each.

## Step 2: Record today's bar

Measure what the project holds now, and write that down in `quality`. Record what is true today, not what you wish it were.

A project whose coverage report says 72% of lines and whose lint prints 14 warnings gets this in `.picket/config.json`:

``` json
{ "quality": { "coverage_min": 70, "max_warnings": 14 } }
```

**What you gain.** From then on, an edit that writes `lines: 60` in `vitest.config.ts` or `--max-warnings 20` in `package.json` is denied.

## Step 3: Pin behaviour before a refactor

Before any refactor, the developer writes a characterization test: one that asserts what the code does today, odd outputs included, and passes before the refactor starts. The procedure is in the `picket:implementing` skill, and the packet's `Red:` line names the test.

**What you gain.** A refactor that changes behaviour by accident fails a test that passed before it.

## Step 4: Approve every silenced check

Sometimes a suppression, a skipped test or a weaker threshold is the right call, such as a flaky test that blocks a release. The developer proposes it on the packet's `Waivers:` line with the reason, and you reply:

``` text
w 1
```

**What you gain.** The review lists every silenced check, waived or not, so the debt stays visible.

## Step 5: Raise the bar

When coverage reaches 78%, set `coverage_min` to 75. When the warnings drop to 6, set `max_warnings` to 6. The same goes for the minimum shares in Picket's own measurement tests.

**What you gain.** Each raise is one small edit to the config, and Picket denies any later edit that falls back under it.

!!! warning "The anti-pattern: ratcheting nothing"

    Recording the bar once and never raising it, or leaving `quality` empty, lets a project that got better quietly get worse again.
