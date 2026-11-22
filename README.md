<p align="center">
  <img alt="PicketAI: guardrails for AI" src="https://raw.githubusercontent.com/picketai/picket/trunk/.github/assets/picket-logo.png" width="280">
</p>

<p align="center">
  <strong>A software-development workflow for Claude Code: four lanes, five agents, one kernel.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@picketai/picket"><img src="https://img.shields.io/npm/v/@picketai/picket/alpha?label=npm" alt="npm version, alpha tag"></a>
  <a href="https://github.com/picketai/picket/actions/workflows/docs.yml"><img src="https://github.com/picketai/picket/actions/workflows/docs.yml/badge.svg" alt="Documentation build"></a>
</p>

<p align="center">
  <a href="https://picketai.github.io/picket/"><strong>Get started</strong></a>
  ·
  <a href="https://picketai.github.io/picket/how-it-works/"><strong>How Picket works</strong></a>
  ·
  <a href="https://picketai.github.io/picket/how-to/"><strong>The daily loop</strong></a>
  ·
  <a href="https://picketai.github.io/picket/lanes/"><strong>Learn more</strong></a>
  ·
  <a href="https://github.com/picketai/picket/blob/trunk/CHANGELOG.md"><strong>Changelog</strong></a>
</p>

You describe a change in plain words. Picket picks how much process it needs, writes a plan when one is worth having, implements it phase by phase, verifies each phase by running it, and stops for your approval before anything lands in git history.

Picket is an alpha, published on npm under the `alpha` dist-tag. Set up a project from its root; nothing is installed globally:

```sh
npx @picketai/picket@alpha init
```

## Documentation

The documentation is at **[picketai.github.io/picket](https://picketai.github.io/picket/)**.

- [Get started](https://picketai.github.io/picket/): install Picket, configure your project, set up testing, upgrade and uninstall.
- [Your first change](https://picketai.github.io/picket/first-change/): a tutorial that takes a tiny project through two changes.
- [How Picket works](https://picketai.github.io/picket/how-it-works/): the parts, and a change from your request to the commit.
- [The daily loop](https://picketai.github.io/picket/how-to/): a change in seven short steps.
- [The four lanes](https://picketai.github.io/picket/lanes/): fast, order, design and research, and how Picket picks one.
- [Troubleshooting](https://picketai.github.io/picket/troubleshooting/): what to do when something stops you.
- Reference: [agents](https://picketai.github.io/picket/reference/agents/), [skills](https://picketai.github.io/picket/reference/skills/), [commands](https://picketai.github.io/picket/reference/cli/), [hooks](https://picketai.github.io/picket/reference/hooks/) and [mods](https://picketai.github.io/picket/reference/mods/).

## The idea

Code decides what code can decide. Lane admission, the next action, phase verification, verdict routing and cost all come from `picket <verb>`; the model fills in what remains. State is the filesystem: one directory per work item under `work/<id>/`, read fresh on every call, never remembered.

## Compared with agent-skills and pstack

agent-skills and pstack teach the model with prose and checklists it chooses to follow, while Picket enforces the same kind of rule in code where code can decide it. [How Picket compares](https://picketai.github.io/picket/comparison/) has the table, what the others do better, and the measured numbers.

## Working on Picket itself

Picket's source is `src/`, and `npm run build` writes the Claude Code plugin it ships to `dist/`. In this repository, start every session with `npm run claude`: it builds, then runs `claude --plugin-dir dist` with this checkout's `dist/bin` first on `PATH`, so `picket` is the checkout's kernel, not the plugin's.

The layout of the repository, the tests, the conventions and the release steps are in `CONTRIBUTING.md`. The benchmark that measures Picket itself, with its 18 golden tasks, is described in `bench/README.md`; every run spends real API budget, so dry-run first.

## Licence

Copyright (C) 2026 Vlad Apetre.

Picket is free software under the [GNU Affero General Public License, version 3](LICENSE). You may use, change and share it, at work included. If you share a changed version, or let others use one over a network, you must offer them its source under the same licence and keep the copyright notices. Picket comes with no warranty.

For a use under other terms, [open an issue](https://github.com/picketai/picket/issues) and ask the maintainer. Versions up to 1.0.0-alpha.7 were released under the MIT licence and stay under it. The vendored third-party files keep their own licences.

## A note from the maintainer

I did not set out to build Picket. It grew out of my own day-to-day work as I started using cloud platforms and AI agents in my professional life. It was not built for any particular company; it is simply the tool I use myself.

I built it to give myself confidence in the work I do. LLMs are a great addition to a developer's toolbox, but they are not a silver bullet for engineering. Picket will keep changing as I learn more about LLMs and as the models themselves evolve.

Picket won't write your specs for you, and it won't turn a spec into finished work on its own. It helps you implement your specs. It keeps your work sane and structured, so you don't have to worry at every step that the agent will go rogue on you.

If you find Picket helpful, feel free to use it. I'm always glad to hear feedback and suggestions for improvement.

Good luck engineering.
