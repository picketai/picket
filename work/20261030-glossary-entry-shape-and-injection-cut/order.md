---
kind: order
lane: order
title: Glossary entry shape and injection cut
date: 2026-10-30
audience: developer
sources: [request.md, artifacts/refactor/19-glossary.md, src/skills/consulting/steps/capture.md, src/skills/consulting/steps/ratify.md, src/skills/documenting/templates/glossary.md, src/skills/documenting/SKILL.md, src/lib/shared/document-path.mts, src/lib/hooks/inject/state/index.mts, src/lib/hooks/inject/state/index.test.mts, src/lib/hooks/lint/schema/index.mts, src/lib/hooks/output.mts, src/lib/hooks/hook-spec.mts, src/lib/hooks.mts, src/lib/shared/paths.mts, test/repo/hook-list.test.mjs, test/repo/plugin-layout.test.mjs, test/hooks/inject.state.test.mjs, test/hooks/lint.schema.test.mjs, test/support/hook.mts, test/support/project.mts, test/timing/budgets.test.mjs, scripts/build.mjs, docs/reference/hooks.md, .claude/MEMORY.md]
phases:
  - n: 1
    files: [src/skills/consulting/steps/capture.md, src/skills/consulting/steps/ratify.md, src/skills/documenting/templates/glossary.md]
    greps:
      - path: src/skills/consulting/steps/capture.md
        pattern: '^Pointer: \{'
      - path: src/skills/consulting/steps/capture.md
        pattern: 'artifacts/strategy/glossary/INDEX\.md'
      - path: src/skills/consulting/steps/capture.md
        pattern: 'steps/ratify\.md'
      - path: src/skills/consulting/steps/ratify.md
        pattern: 'artifacts/strategy/glossary/'
      - path: src/skills/documenting/templates/glossary.md
        pattern: 'location: artifacts/strategy/glossary/<term-slug>\.md'
      - path: src/skills/documenting/templates/glossary.md
        pattern: '^(?![\s\S]*this work item.s directory)'
        flags: i
    tests: true
    drive: false
  - n: 2
    files: [src/lib/shared/glossary.mts, src/lib/shared/glossary.test.mts, src/lib/hooks/inject/state/index.mts, src/lib/hooks/inject/state/index.test.mts, src/lib/hooks.mts, docs/reference/hooks.md]
    greps:
      - path: src/lib/shared/glossary.mts
        pattern: 'export const GLOSSARY_CHARS = 6000\b'
      - path: src/lib/shared/glossary.mts
        pattern: 'export function injectedGlossary\b'
      - path: src/lib/shared/glossary.mts
        pattern: 'export function glossaryBody\b'
      - path: src/lib/shared/glossary.test.mts
        pattern: 'Cut at 6,000 characters; read \.claude/MEMORY\.md for the rest\.'
      - path: src/lib/hooks/inject/state/index.mts
        pattern: 'shared/glossary\.mts"'
      - path: src/lib/hooks/inject/state/index.mts
        pattern: '^(?![\s\S]*GLOSSARY_CHARS = )'
        flags: i
    tests: true
    drive: true
  - n: 3
    files: [src/lib/hooks/lint/glossary/index.mts, src/lib/hooks/lint/glossary/index.test.mts, src/lib/hooks.mts, test/repo/hook-list.test.mjs, docs/reference/hooks.md]
    greps:
      - path: src/lib/hooks.mts
        pattern: '"lint\.glossary": \{'
      - path: src/lib/hooks/lint/glossary/index.mts
        pattern: 'export const hook: HookSpec<"PostToolUse">'
      - path: src/lib/hooks/lint/glossary/index.mts
        pattern: 'shared/glossary\.mts"'
      - path: src/lib/hooks/lint/glossary/index.mts
        pattern: 'artifacts/strategy/decisions/'
      - path: test/repo/hook-list.test.mjs
        pattern: '\["PostToolUse", "Write\|Edit", \["lint\.schema", "lint\.glossary"\]\]'
      - path: docs/reference/hooks.md
        pattern: '\| `lint\.glossary` \| PostToolUse \|'
    tests: true
    drive: true
---
# Order: Glossary entry shape and injection cut

## Problem

`.claude/MEMORY.md` is injected into every session by `inject.state`, which slices it at `GLOSSARY_CHARS = 6000` mid-entry with no note (`src/lib/hooks/inject/state/index.mts:12,41`). Today's file is 6,744 characters (after CRLF is read as LF), so the slice ends inside the "Hooks stay one Node process" decision and the last three decisions never reach the session, while the half entry reads as whole. Three files describe a glossary entry and disagree: `capture.md` has no pointer line and no rule for long entries, and the template's location comment names a path that `picket name glossary` (`artifacts/strategy/glossary/<slug>.md`, verified) does not use. Nothing tells a writer the file outgrew the cut. Binding: a capture mid-discussion must never fail, and every hook stays under 200 ms cold.

## Decisions

### D-001: Capture owns the short shape; ratify writes the long entry
**Decision:** `capture.md` holds the one short entry shape (`**Term**:`, one or two sentences, an optional `Pointer:` line with one path or command, `_Avoid_:`) and the long-entry rule: a term that needs distinguished-from, anti-examples or per-context meanings gets a file under `artifacts/strategy/glossary/` through `steps/ratify.md`'s term row, on the user's word like every ratification, and its short entry keeps the definition plus a `Pointer:` to that file. Once `artifacts/strategy/glossary/INDEX.md` exists, `## Language` carries one line pointing to it, which is how every MEMORY.md reader finds the long entries. `ratify.md`'s term row and the template's location comment name the same folder.
**Instead of:** capture writing the long file itself: it would duplicate ratify's procedure and skip the user's word that every other artifact under `artifacts/strategy/` waits for.
**Risks:**
- **RISK-001** A long entry waits for the user's word, so detail sits in the discussion meanwhile. Mitigation: the short entry still lands at once, as rule 3 already does for decisions.

### D-002: One shared module owns the limit, the measurement and the cut
**Decision:** a new `src/lib/shared/glossary.mts` exports `GLOSSARY_CHARS = 6000`, `glossaryBody(raw)` (CRLF read as LF, then trimmed; the length every check uses) and `injectedGlossary(raw)` (the body whole, or cut with the note). `inject.state` and the new write check both import it, so the number and the way characters are counted exist once. Counting after CRLF to LF makes today's file 6,744, the figure in `artifacts/refactor/19-glossary.md`; counted raw it is 6,814.
**Instead of:** keeping the constant in `inject.state` and importing it from the lint hook: hook folders would import each other, and the two hooks could count CRLF files differently.
**Risks:**
- **RISK-002** The injected text changes from CRLF to LF on Windows checkouts. Mitigation: the model reads both the same; the unit test pins LF output.

### D-003: Cut at the last whole entry and say so
**Decision:** when the body exceeds `GLOSSARY_CHARS`, keep the text before the last entry boundary at or under 6,000 characters, trim its end, and append a blank line and `Cut at 6,000 characters; read .claude/MEMORY.md for the rest.` (path from `hostRel("MEMORY.md")`). A boundary is the start of a line that begins `## `, begins `- **`, or begins `**` after a blank line. With no boundary in range, cut at the last whole line; with not even one whole line, inject only the note. A body at or under the limit is injected whole, as today. For today's file the cut lands at character 5,993, before the "Hooks stay one Node process" decision.
**Instead of:** raising the limit: every session pays the extra characters on every turn, and the file grows past any number.
**Risks:**
- **RISK-003** An entry with an internal blank line followed by `**` is split there. Mitigation: the cut is still at a line start and the note is always present.

### D-004: A separate `lint.glossary` hook that warns and never blocks
**Decision:** a new hook folder `src/lib/hooks/lint/glossary/` registered in `HOOKS` on `PostToolUse` with matcher `Write|Edit`, right after `lint.schema`. When the written path is the host folder's `MEMORY.md` and its body exceeds `GLOSSARY_CHARS`, it returns `context("PostToolUse", …)` naming the size (for example `6,744`), the 6,000 limit, and "move the longest decision's detail to an SDR under `artifacts/strategy/decisions/` and leave a pointer". Any other path, a missing file or a read error returns null. `scripts/build.mjs` derives the bundle and `hooks.json` from `HOOKS`, so no build edit is needed.
**Instead of:** a branch inside `lint.schema`: it saves one process per Write and Edit, but mixes an artifact linter with a size warning and its "Fix these before ending the turn" line contradicts warn-never-block. The cost kept: one more cold Node start per Write and Edit, inside the same matcher group as `lint.schema`.
**Risks:**
- **RISK-004** The extra process breaks the 200 ms cold budget. Mitigation: it returns before any read for other paths, and `test/timing/budgets.test.mjs` walks every bundle in `dist/hooks/`, the new one included.

## Scope
**In:**
- `capture.md` short shape with `Pointer:` and the long-entry rule; `ratify.md`'s term row and the glossary template's location comment
- the whole-entry cut with its note in `inject.state`, through the shared module
- the `lint.glossary` warning on writes of `.claude/MEMORY.md` past 6,000 characters

**Out:**
- editing `.claude/MEMORY.md` (the lead does it after the user approves the text)
- `discuss.md` and `interview.md` reading `INDEX.md` directly (the `## Language` pointer line carries them there)
- moving development's memory; the bench

## Phase 1: The short shape and the long-entry path
**Touch set:**
- `src/skills/consulting/steps/capture.md`: shape, Pointer line, long-entry rule
- `src/skills/consulting/steps/ratify.md`: term row names the folder
- `src/skills/documenting/templates/glossary.md`: location comment names the folder
**Changes:** In `capture.md`'s `## Structure` block, add the line `Pointer: {one path or command, no explanation}` between the definition and `_Avoid_:`. Add one rule under `## Rules`: the `Pointer:` line is optional; a term needing more than the short shape gets a long entry through `steps/ratify.md`'s term row, its short entry keeps the definition and a `Pointer:` to the file, and `## Language` carries one line pointing to `artifacts/strategy/glossary/INDEX.md` once that file exists. In `ratify.md`, the term row's path cell names `artifacts/strategy/glossary/` beside `picket name glossary "<term>"` and says the short entry in `.claude/MEMORY.md` points to the file. In the template, the comment that starts `location:` says `artifacts/strategy/glossary/<term-slug>.md` (from `picket name glossary "<term>"`) and drops "this work item's directory, or artifacts/<kind>/"; the per-context sentence stays.
**Done when:**
- **T-1.1** `capture.md`'s structure block shows `**{Term}**:`, the definition line, `Pointer: {one path or command, no explanation}` and `_Avoid_:` in that order.
- **T-1.2** `capture.md` states the long-entry rule, naming `steps/ratify.md`, the `Pointer:` back to the file, and the `artifacts/strategy/glossary/INDEX.md` line under `## Language`.
- **T-1.3** `ratify.md`'s term row names `artifacts/strategy/glossary/`; `templates/glossary.md` names `artifacts/strategy/glossary/<term-slug>.md` and no longer contains "this work item's directory".
- **T-1.4** `capture.md` stays at most 80 lines and `npm test` passes, budgets included.

## Phase 2: Cut the injected glossary at a whole entry
**Touch set:**
- `src/lib/shared/glossary.mts`: new; limit, body, cut [INFERRED: new file]
- `src/lib/shared/glossary.test.mts`: new; unit tests of the cut [INFERRED: new file]
- `src/lib/hooks/inject/state/index.mts`: `glossaryPart` uses the module
- `src/lib/hooks/inject/state/index.test.mts`: handler-level glossary tests
- `src/lib/hooks.mts`: `inject.state` summary mentions the cut
- `docs/reference/hooks.md`: regenerated by the build
**Changes:** Create the module of D-002 with the cut of D-003; `glossaryBody` and `injectedGlossary` are pure functions of the file text. `glossaryPart` reads the file, returns null for an empty body, and otherwise injects `injectedGlossary(text)` under its existing heading; delete the local `GLOSSARY_CHARS`. The `inject.state` summary becomes "open work items with their next action, plus the host folder's `MEMORY.md` cut at the last whole entry within 6,000 characters". Run `npm run build` and stage the regenerated `docs/reference/hooks.md` before `npm test`.
**Done when:**
- **T-2.1** Unit tests show a body of 5,999 and of exactly 6,000 characters returned whole with no note.
- **T-2.2** Unit tests show an over-limit body cut before a `**Term**:` after a blank line, before a `- **` decision line, and before a `## ` heading, one test each; the kept part is at most 6,000 characters and ends with no partial line.
- **T-2.3** Every cut output ends with `Cut at 6,000 characters; read .claude/MEMORY.md for the rest.` after a blank line; a body with no boundary in range cuts at the last whole line.
- **T-2.4** A unit test shows a CRLF body whose LF length is 6,000 returned whole, and `glossaryBody` of a CRLF text contains no `\r`.
- **T-2.5** An `inject/state/index.test.mts` test with a 6,100-character `MEMORY.md` shows the context holding the earlier entries, not the last one, and ending with the note.
- **T-2.6** Drive: `node dist/hooks/inject.state.mjs` fed `{"hook_event_name":"SessionStart"}` with `CLAUDE_PROJECT_DIR` at a scratch project holding a copy of today's `.claude/MEMORY.md` prints `additionalContext` ending with the note, with no "Hooks stay one Node process" text in it.

## Phase 3: Warn when MEMORY.md outgrows the cut
**Touch set:**
- `src/lib/hooks/lint/glossary/index.mts`: new hook handler [INFERRED: new file]
- `src/lib/hooks/lint/glossary/index.test.mts`: new; handler unit tests [INFERRED: new file]
- `src/lib/hooks.mts`: `lint.glossary` entry after `lint.schema`
- `test/repo/hook-list.test.mjs`: `EXPECTED_GROUPS` Write|Edit PostToolUse row
- `docs/reference/hooks.md`: regenerated by the build
**Changes:** Add the hook of D-004, shaped like `lint.schema`: resolve `tool_input.file_path` against `event.cwd ?? root`, compare the forward-slash path relative to root with `hostRel("MEMORY.md")`, read and measure with `glossaryBody`, and return context only. Register it with a one-line summary; extend the `PostToolUse` `Write|Edit` row of `EXPECTED_GROUPS` to `["lint.schema", "lint.glossary"]`. Run `npm run build` and stage `docs/reference/hooks.md` before `npm test`.
**Done when:**
- **T-3.1** A unit test with a 6,001-character `.claude/MEMORY.md` gets PostToolUse context naming `6,001`, the 6,000 limit, and `artifacts/strategy/decisions/`.
- **T-3.2** Unit tests get null for a 6,000-character `MEMORY.md`, for a CRLF file whose LF length is 6,000, for another file path over 6,000 characters, and for a `MEMORY.md` path that does not exist.
- **T-3.3** The hook never returns a `decision` or `permissionDecision` key; the over-limit output holds only `hookSpecificOutput`.
- **T-3.4** `test/repo/hook-list.test.mjs` passes with `lint.glossary` after `lint.schema` in the `PostToolUse` `Write|Edit` group, and `docs/reference/hooks.md` in the git index lists `lint.glossary`.
- **T-3.5** `npm test` passes, including "hooks start cold under the budget" over `dist/hooks/lint.glossary.mjs`.
- **T-3.6** Drive: `node dist/hooks/lint.glossary.mjs` fed a `PostToolUse` `Write` payload for `.claude/MEMORY.md`, with `CLAUDE_PROJECT_DIR` at a scratch project holding a copy of today's file, prints context naming `6,744`; the same payload for `README.md` prints nothing.

## Open questions

none

## Revision log
