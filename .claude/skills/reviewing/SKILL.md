---
name: reviewing
description: >
  Severity vocabulary, finding format, verdict rule, and the per-size load table for the
  checklist files under steps/. Reads the kernel's review summary (size, frameworks,
  concerns, security_path, changed_files) and turns it into a code review or a
  design-record cross-check. Use when a developer phase summary or All Phases Complete
  lands and an APPROVED or CHANGES REQUIRED verdict is due, when the user says "review
  this phase", "review the diff", or "run an alignment check", or when CROSS_CHECK_REQUESTED
  or /cross-check asks whether a design record's decisions and phases agree (ALIGNED or
  DRIFT DETECTED). `/reviewing <pull request URL>` reviews a pull request on Azure DevOps
  (Server or Services) or GitHub from the local clone, and posts the findings back only when asked.
user-invocable: true
---

# Skill: reviewing

Reference for the reviewer: what the kernel hands you, which checklist to open, how to grade and write a finding, and when a verdict may say APPROVED. Procedure (reading the diff, memory, the output block) belongs to the reviewer agent and its step files; this skill carries only the shared rules.

## The review summary

The kernel computes size and detection before you run. It passes one JSON object:

```json
{ "size": "small|medium|large", "frameworks": ["typescript", "dotnet"], "concerns": ["clean-architecture", "vertical-slice"], "security_path": false, "changed_files": ["src/..."] }
```

Field meaning:

- `size`: the diff class, from changed files and changed lines. Never recompute it.
- `frameworks`: detected frameworks that have a checklist. An unlisted framework has no file to load.
- `concerns`: detected architecture concerns, already tie-broken. Load exactly what is listed.
- `security_path`: true when any changed file sits under a CLAUDE.md `## Security paths` entry.
- `changed_files`: the review scope. A finding outside this set is out of range (see Severities).

Summary missing or a field absent: ask for it and stop. Do not fall back to your own detection.

A cross-check request carries no summary because there is no diff. Load `steps/60-crosscheck.md` alone.

## Load table

| Size | Load |
|---|---|
| small | `10-alignment.md`, `30-patterns-security.md`, one `40-framework-<name>.md` per framework |
| medium | the small set plus `20-patterns-core.md` (skip its SOLID and DRY sections) and one `50-concern-<name>.md` per concern |
| large | the medium set with `20-patterns-core.md` in full |

`security_path: true` overrides size: load `20-patterns-core.md` in full and `30-patterns-security.md`, and read every changed security-path file in full, whatever the size. `30-patterns-security.md` sits on every row because a 2-file, 40-line change can hardcode a secret as easily as a large one.

Every checklist row has the same shape: id, check, fail condition, severity. Run each row against the changed files; a row whose target construct does not appear is skipped silently.

## Severities

First match wins.

- Critical: wrong behaviour, data loss, a security hole, or an unhandled exception on the happy path; also the code-level gap behind an alignment FAIL when the missing behaviour is the criterion's core.
- Major: a listed check fails with a concrete failure scenario and no Critical condition holds; a partially met acceptance criterion.
- Minor: advisory: style, naming, readability, or a best practice not in any checklist.
- Nit: a typo, formatting, or wording point with no behavioural effect.

Out of range: a defect on a line the diff did not touch (`git blame` SHA outside the range, or a file outside `changed_files`) is not a finding of this review. Mention it once as a Nit prefixed `pre-existing:` if it matters; it never counts toward the verdict. One exception: in a cumulative review, a story requirement (`S` row) with no code anywhere is in range and FAILs wherever its code should have been.

Machine-enforced exclusions: a finding the project's own gates already reject is noise. Before writing findings, note the enforced set from config: compiler warnings-as-errors and analyzers at `error`, banned-API lists, architecture-test projects, lint rules at `"error"`, strict `tsconfig` flags, pre-commit hooks, unconditional CI steps, DB constraints in migrations, and the resolved test and lint command. Skip findings in those classes. Three limits: nothing is excluded until it is detected; a rule at `warning`, or a path outside the tool's include glob, is not enforced; the guard's own code (trigger SQL, analyzer rule, auth filter, validator) stays fully in scope.

## Evidence bar

A false Critical costs more than a missed Minor. Before a finding is written:

1. Cite `path:line` from source read in this pass, not from the diff header or from memory.
2. Never infer behaviour from a name, and never assert library semantics from memory; read the code path, the overload, or the config value.
3. Try to disprove it: read callers, tests, configuration. A finding that does not survive is dropped silently.
4. Critical and Major carry a concrete failure scenario (inputs or state, then the wrong output, exception, or data effect). No scenario, no Critical or Major: demote or drop. "Looks fragile" is not a scenario.
5. One finding per defect. When two checks fire on the same lines, report once at the higher severity and name both check ids.

## Finding format

One line per finding, Critical first, then Major, Minor, Nit:

```
- [Severity] path:line — one sentence what, one sentence why it matters, one sentence the fix
```

The em dash after the location is the protocol separator and the only place one appears. Cap: 25 findings per review. Past the cap, add one line `+N more not shown (Minor a, Nit b)`; Critical and Major are never the ones cut. Cross-check findings use the same line with `record.md#D-003` or `record.md#phase-2` as the location.

## Verdict rule

The last line of a review is exactly `APPROVED` or `CHANGES REQUIRED`, alone. `APPROVED` is blocked by any Critical, any alignment row at FAIL, and any alignment row at UNCLEAR. Major, Minor, Nit, and out-of-range items never block.

UNCLEAR blocks fail-closed because an unjudgeable criterion is a plan defect, not a developer defect: the verdict reason names the ambiguity so the team lead routes it to the architect, not back to the developer.

Story rows (`S-N`, cumulative only, `steps/15-traced.md`) differ in one way: FAIL blocks, UNCLEAR does not. An ambiguous story is a question for the user, so it goes on the `Questions:` line instead.

The last line of a cross-check is exactly `ALIGNED` or `DRIFT DETECTED`, alone. Any Critical or Major row gives `DRIFT DETECTED`; Minor rows are recorded and do not block.

## Pull request mode (`/reviewing <url>`, lead only)

The kernel finds the clone by the repository name in the URL: the project root, or a nested repository under it (`src/Rent` in an umbrella); `--repo <path>` names it outright. No clone found: it fails with a clear line, and you tell the user to clone first. Sequence, in one turn:

1. `node .claude/bin/harness.mjs pr <url> --human` (the JSON form goes to the reviewer; keep the `repo_root` it names). It fetches `refs/pull/<id>/merge`, computes base and head, the review summary over that range, and the PR's title and description (Azure DevOps: a PAT in `AZDO_PAT`, set once with `setx AZDO_PAT <token>` or in the `env` block of the untracked `.claude/settings.local.json`, never in a tracked file; GitHub: the `gh` CLI). A missing PAT is reported, not fatal: the review runs code-only. Any other error: print it and stop.
2. Spawn the reviewer once, named `reviewer`, with `scope: pr`, `pr: <the JSON from step 1, verbatim>`, `step: .claude/skills/reviewing/steps/10-alignment.md`. Its verdict routes nowhere; the hook saves the block to `.claude/ledger/pr-<id>.review.md`.
3. Print the reviewer's block verbatim, then one options line: `[p] post to the PR   [d] done`. Nothing is written to the PR before `p`. When the block says `Alignment: N/A (no description)`, add one line under it: the PR carried no intent to check the diff against, so half the review is missing; a two-line description in the PR template restores it. Before `p`, check the finding line numbers against the file at head once (`git -C <repo_root> show <head>:<path> | sed -n '<line>,+3p'`); a wrong anchor puts the thread on the wrong code, and the first two live reviews were both off.
4. On `p`: `node .claude/bin/harness.mjs pr <url> --post .claude/ledger/pr-<id>.review.md --dry-run --human` shows what would go; print it and ask once more with `[y] post   [n] keep local`; on `y`, the same command without `--dry-run`. Azure DevOps only; on GitHub, tell the user to use `gh pr review`.

## Layout

```
.claude/skills/reviewing/
  SKILL.md                                this file
  steps/10-alignment.md                   criteria to evidence, plus the comment and test floors (always)
  steps/15-traced.md                      cumulative only: request and story first, plan last; replaces 10's alignment part
  steps/20-patterns-core.md               SOLID, DRY, correctness, naming (medium and large)
  steps/30-patterns-security.md           secrets, injection, insecure defaults, guard bypass (always)
  steps/40-framework-typescript.md        types, promises, errors, React, imports, leaks
  steps/40-framework-dotnet.md            async, DI, EF Core, null safety, exceptions, disposal
  steps/50-concern-clean-architecture.md  dependency direction, domain model, use cases, interfaces
  steps/50-concern-vertical-slice.md      slice isolation, completeness, messaging, over-engineering
  steps/60-crosscheck.md                  decisions versus phases inside one design record
```
