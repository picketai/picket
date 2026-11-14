---
kind: order
lane: order
title: Mods match the host hook types
date: 2026-11-14
audience: developer
sources: [work/20261113-mods-match-the-host-hook-types/request.md, work/20261113-mods-match-the-host-hook-types/preflight.txt, scripts/test.mjs, package.json, tsconfig.json, CONTRIBUTING.md, .github/workflows/release.yml, src/mods/index.tsx, src/mods/markdown/hooks/index.tsx, src/mods/markdown/hooks/links.ts, src/mods/markdown/hooks/data.ts, src/mods/markdown/hooks/index.test.tsx, src/mods/markdown/hooks/picket-markdown.test.tsx, src/mods/status/hooks/index.tsx, src/mods/status/hooks/index.test.tsx, src/lib/verbs/mutate/index.mts, src/lib/shared/tooling.mts, src/lib/verbs/verify/index.mts, src/lib/shared/work/declared-checks.mts, test/repo/mods.test.mjs, test/repo/mod-contracts.test.mjs, test/repo/private-terms.test.mjs, dist/.claude-plugin/types/claude-code/index.d.ts]
phases:
  - n: 1
    files: [scripts/test.mjs, scripts/mods-report.mjs, test/repo/mods-report.test.mjs, test/repo/mods-report/validate-2.1.325.json]
    greps:
      - path: scripts/mods-report.mjs
        pattern: export function hostTypeErrors\b
      - path: scripts/mods-report.mjs
        pattern: do not match the hook API types of Claude Code
      - path: scripts/test.mjs
        pattern: \bhostTypeErrors\b
      - path: scripts/test.mjs
        pattern: --json
    tests: false
    drive:
      - covers: T-1.1
        command: node scripts/test.mjs build mods
        exit_code: 1
        contains:
          - "do not match the hook API types of Claude Code"
          - "27 type errors"
          - "hooks/mods/index.tsx:38:57 TS2345"
          - "hooks/mods/markdown/hooks/index.tsx:75:17 TS2345"
          - "mods: exit 1"
      - covers: T-1.6
        command: node scripts/test.mjs unit build product timing
        exit_code: 0
        contains:
          - "timing: exit 0"
  - n: 2
    files: [src/mods/markdown/hooks/index.tsx, src/mods/markdown/hooks/index.test.tsx, src/mods/markdown/hooks/picket-markdown.test.tsx, src/mods/status/hooks/index.test.tsx]
    greps:
      - path: src/mods/status/hooks/index.test.tsx
        pattern: \bisCollapsed\b
      - path: src/mods/markdown/hooks/index.test.tsx
        pattern: \bpresentation\b
      - path: src/mods/markdown/hooks/index.test.tsx
        pattern: \bcontentRows\b
      - path: src/mods/markdown/hooks/index.tsx
        pattern: \bas (never|any|unknown)\b|@ts-(expect-error|ignore)
        absent: true
      - path: src/mods/markdown/hooks/index.test.tsx
        pattern: \bas (never|any|unknown)\b|@ts-(expect-error|ignore)
        absent: true
      - path: src/mods/markdown/hooks/picket-markdown.test.tsx
        pattern: \bas (never|any|unknown)\b|@ts-(expect-error|ignore)
        absent: true
      - path: src/mods/status/hooks/index.test.tsx
        pattern: \bas (never|any|unknown)\b|@ts-(expect-error|ignore)
        absent: true
    tests: true
    drive:
      - covers: T-2.1
        command: node scripts/test.mjs build mods
        exit_code: 0
        contains:
          - "0 fail"
          - "mods: exit 0"
---
# Order: Mods match the host hook types

## Problem

The `mods` step of `npm test` runs `claude plugin validate --strict dist`, which type-checks the built mods against the hook API types of the installed Claude Code. Under Claude Code 2.1.325 (installed here on 2026-11-14) it reports 27 `error TS` lines in five files (1 in `hooks/mods/index.tsx`, 16 in `hooks/mods/markdown/hooks/index.test.tsx`, 1 in `hooks/mods/markdown/hooks/index.tsx`, 2 in `hooks/mods/markdown/hooks/picket-markdown.test.tsx`, 7 in `hooks/mods/status/hooks/index.test.tsx`, counted from the `--json` report), so `claude plugin test dist` never runs; run alone, it fails 2 of 137 band tests. Nothing in the step's failure says the host's types moved, and because `picket mutate` takes its baseline from `npm test`, every item's mutation spot check reads `baseline red` until the mods catch up. The fix may not add pane behaviour, touch the plugin icon warning, or change what the validator checks.

## Decisions

### D-001: The validator stays the only type check of the mods, and the mods step names its type errors
**Decision:** `scripts/test.mjs` keeps running `claude plugin validate --strict dist` as today. When it exits non-zero, the step runs it once more with `--json`, and a new pure module `scripts/mods-report.mjs` turns that report into a named failure: the header `mods: the mods do not match the hook API types of Claude Code <version>: <n> type errors`, then one line `  <path>:<line>:<column> <TScode>` per error, in report order, with `<path>` relative to `dist/` and `/` separators. `<version>` is the first word `claude --version` prints. The same text then shows in CI's `mods` job (`node scripts/test.mjs build mods`), which installs the latest Claude Code, so a host change is named there first. Gives up: a failing validation costs one extra run of about 2 s (timed here).
**Instead of:** adding `src/mods` to `npm run typecheck` with a second tsconfig that reads the host types: those types exist only after the validator writes them into the ignored `dist/.claude-plugin/types/` folder, and the validator already compiles the built mods with the host's own compiler options (`noUncheckedIndexedAccess`, the `h` JSX factory), so a second configuration would repeat the check and drift from it.
**Risks:**
- **RISK-001** A later host renames a key of the `--json` report (`contents`, `warnings`, `path`, `message`), so `hostTypeErrors` finds nothing. Mitigation: the step's exit code comes from the validator, never from the classifier, so the step still fails; only the named lines go missing, and the fixture test shows which key moved.
- **RISK-002** The host updates again before phase 1's drive runs, moving the counts or positions its criteria name. Mitigation: phase 1 recounts first and stops with the new counts on its block, for an amendment.

### D-002: The classifier is tested on the validator's real report, captured once
**Decision:** The unit test reads `test/repo/mods-report/validate-2.1.325.json`, the `--json` report the validator printed for the base, with only the absolute repository path replaced by `/repo`. This follows the round-trip rule of `.claude/rules/harness-authoring.md`: the reader is fed the writer's real output. Gives up: the fixture pins the 2.1.325 report shape and is not refreshed by later hosts.
**Instead of:** a hand-written report holding two warnings: it would encode my reading of the shape, not the validator's, and miss fields such as `manifest.warnings` or the `directory` findings that must not be counted.

### D-003: The tests meet the host types with full values, never with casts
**Decision:** Each test input carries every field the host now requires (`origin` and `presentation` on `CommandRunInput`, `offset`, `bodyRows`, `contentRows` and `origin` on `UiScrollInput`, `isCollapsed` on the band props, `title`, `isShown`, `isFocused`, `isPlaced` on a `UiPane`), an op result is `{ value: <the host's value type> }` or `{ deny: <reason> }`, and a shared helper builds a repeated input once per file. Gives up: longer test fixtures.
**Instead of:** `as never` or `as unknown as` casts on the inputs: a cast hides the next host change from the very check D-001 names.

### D-004: `picket mutate` keeps `npm test` as its baseline
**Decision:** No change to `src/lib/verbs/mutate/index.mts` or `src/lib/shared/tooling.mts`. The baseline and the kill check stay the project's test command, which `.picket/config.json` `commands.test` can already override for any project. Gives up: while the host's types are ahead of the mods, every item's spot check reads `baseline red`, which the reviewer's `bar.md` checklist already reports on the `Checked:` line; D-001 keeps that window short by naming the cause.
**Instead of:** a mutate-only command that skips the `mods` step (`node scripts/test.mjs unit build product timing`): a mutant planted under `src/mods` is killed only by `claude plugin test` in that step, so it would survive on every item that edits the mods, a false finding, and the repository would hold a second definition of "the suite passes".

## Scope

**In:**
- the named host type failure in the `mods` step, with its classifier, unit test and captured report (phase 1)
- the call site types behind `src/mods/index.tsx:38` and `src/mods/markdown/hooks/index.tsx:75`, and the three mods test files, brought up to the 2.1.325 types (phase 2)
- the decision that `picket mutate` keeps its baseline (D-004, no phase)

**Out:**
- any new behaviour in the status band, the work pane or the Markdown pane; `src/mods/status/hooks/index.tsx` stays unedited
- the plugin icon warning (`ICON_MISSING`, non-blocking)
- any part of SDR 00004
- what `claude plugin validate` checks, and any change to `picket mutate`

## Phase 1: The mods step names a host type mismatch

**Touch set:**
- `scripts/test.mjs`: the `mods` step to extend
- `scripts/mods-report.mjs`: new pure report classifier
- `test/repo/mods-report.test.mjs`: new unit tests of it
- `test/repo/mods-report/validate-2.1.325.json`: the captured validator report
- `test/repo/mods.test.mjs`: precedent for importing `scripts/` [read only]
- `test/repo/private-terms.test.mjs`: scans every tracked line [read only]

**Changes:**
First, before any edit: run `claude --version` and `node scripts/test.mjs build`, then `claude plugin validate --strict --json dist`, and count the `error TS` warnings. If the version is not 2.1.325 or the count is not 27, stop and put both on the block. Otherwise save the report as the fixture, replacing every occurrence of the absolute repository path with `/repo` and changing nothing else.

`scripts/mods-report.mjs` exports two pure functions:
- `hostTypeErrors(report, distRoot)` returns `{ file, line, column, code }[]`, one per entry of `manifest.errors`, `manifest.warnings`, and each `contents[i].errors` and `contents[i].warnings` whose `message` starts with `error TS<digits>:` and whose `path` reads `line <n>, column <n>`. `file` is the entry's `file` relative to `distRoot`, with `/` separators. Anything else in the report (notes, advice, `directory` findings) is never counted.
- `hostMismatchReport(version, errors)` returns the header and location lines of D-001 as one string.

In `scripts/test.mjs`, `claudeOnPath` becomes a function returning the version word or `null`; the skip message stays. The `mods` step runs the human validation as now; on a non-zero exit it runs the `--json` validation with stdout captured, parses it, prints `hostMismatchReport` when `hostTypeErrors` finds any, and returns 1 in every failing case, a report that does not parse included. A passing validation then runs `claude plugin test dist` as now.

`npm test` stays red at its `mods` step in this phase, because phase 2 removes the 27 errors; the frontmatter therefore sets `tests: false` and the T-1.6 drive runs the other four steps.

**Done when:**
- **T-1.1** On the unedited mods, `node scripts/test.mjs build mods` exits 1 and prints `mods: the mods do not match the hook API types of Claude Code 2.1.325: 27 type errors`, then 27 location lines, the first `  hooks/mods/index.tsx:38:57 TS2345`, and among them `  hooks/mods/markdown/hooks/index.tsx:75:17 TS2345`.
- **T-1.2** A unit test gives `hostTypeErrors` the fixture with root `/repo/dist` and gets 27 entries, the first `{ file: "hooks/mods/index.tsx", line: 38, column: 57, code: "TS2345" }`, grouped by file as 1, 16, 1, 2 and 7 for the five files named in the Problem.
- **T-1.3** A unit test gives `hostTypeErrors` the fixture with every `error TS` warning removed and gets an empty list.
- **T-1.4** A unit test gives `hostMismatchReport` the version `2.1.325` and the 27 fixture errors and gets exactly 28 lines: the header of T-1.1, then each location line in report order.
- **T-1.5** A unit test reads the fixture and finds every `file` value starting with `/repo/dist/`, so no machine path is committed.
- **T-1.6** `node scripts/test.mjs unit build product timing` exits 0.

## Phase 2: The mods and their tests match the 2.1.325 types

**Touch set:**
- `src/mods/markdown/hooks/index.tsx`: `AppendedMessage` at line 17, call at 75
- `src/mods/index.tsx`: line 38 call site [read only]
- `src/mods/markdown/hooks/links.ts`: `fromHref` returns `string | undefined` [read only]
- `src/mods/markdown/hooks/data.ts`: `addFiles` takes `readonly string[]` [read only]
- `src/mods/markdown/hooks/index.test.tsx`: 16 type errors
- `src/mods/markdown/hooks/picket-markdown.test.tsx`: 2 type errors
- `src/mods/status/hooks/index.test.tsx`: 7 type errors, 2 band failures

**Changes:** The host types to read are the ones the validator writes into the ignored `dist/.claude-plugin/types/claude-code/index.d.ts`.
- `src/mods/markdown/hooks/index.tsx`: the host now types `session.append`'s `message.role` as `'user' | 'assistant' | undefined`, so `AppendedMessage`'s `role` becomes optional; `rememberReply` keeps comparing it with `'assistant'`, so its behaviour holds and `src/mods/index.tsx:38` compiles without an edit. At line 75 the `fromHref` results are filtered to strings before `addFiles`; `link` collects only `file:` hrefs, so nothing is dropped in practice.
- The three test files, by error class from the validator output: `type ClockEvery = Parameters<Parameters<On>[1]>` no longer works, because `On`'s second parameter is now the matcher of its three-argument form, so derive it from the host's `Hook<'clock.every'>`; `command.register` answers `{ value: { command } }`; a `session.id` that cannot be read answers `{ deny: <reason> }`; and the inputs follow D-003.
- `src/mods/status/hooks/index.test.tsx`, the 2 band failures: under 2.1.325 the hooks a test registers draw their own band row as plugin `test`, so the `world` helper's catch-all `ui.render` hook adds an `engine` row beside picket's. A scratch probe plugin confirmed this on 2026-11-14: a test `ui.render` hook heard `AbovePrompt` only with `e.plugin` `test`, never for the mod's own chain. The `world` hook passes `AbovePrompt` to `next`, and the survey test of T-2.3 asserts that under a survey picket's row draws no Text, instead of a Text reading `engine`.

**Done when:**
- **T-2.1** `node scripts/test.mjs build mods` exits 0: the strict validation prints no `error TS` line and `claude plugin test dist` reports 0 failed tests.
- **T-2.2** `npm test` exits 0.
- **T-2.3** The status test `the band yields to a survey and otherwise draws the work line with no session line` asserts no Text in the band under a survey and the work line without one, and no band test asserts an `engine` Text.
- **T-2.4** None of the four files of this phase holds `as never`, `as any`, `as unknown`, `@ts-expect-error` or `@ts-ignore`.
- **T-2.5** `git diff --name-only 885a3d2f -- src/mods` lists exactly the four files of this phase.

## Open questions

none

## Revision log
