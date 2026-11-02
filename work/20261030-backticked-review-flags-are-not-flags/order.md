---
kind: order
lane: order
title: Backticked review flags are not flags
date: 2026-10-30
audience: developer
sources: [request.md, working tree diff of src/lib/shared/work/{report,artifact}.mts and their tests, src/lib/verbs/close/close.mts, work/20261030-consulting-the-brief-and-the-prompt-hook/order.md]
phases:
  - n: 1
    files: [src/lib/shared/work/report.mts, src/lib/shared/work/artifact.mts, src/lib/shared/work/report.test.mts, src/lib/shared/work/artifact.test.mts, .claude/agent-memory/picket-developer/lane-open-line-pinned.md]
    greps:
      - path: .claude/agent-memory/picket-developer/lane-open-line-pinned.md
        pattern: '`src/skills/ordering/steps/open.md`'
      - path: src/lib/shared/work/report.mts
        pattern: 'export function carriesFlag\(line: string, flag: string\): boolean'
      - path: src/lib/shared/work/report.mts
        pattern: 'carriesFlag\(line, flag\)'
      - path: src/lib/shared/work/artifact.mts
        pattern: 'carriesFlag\(line, STRATEGIC_REVIEW\)'
      - path: src/lib/shared/work/artifact.mts
        pattern: '^(?![\s\S]*includes\(STRATEGIC_REVIEW\))'
        flags: i
      - path: src/lib/shared/work/report.test.mts
        pattern: 'a flag quoted in backticks on a finding line flags nothing'
      - path: src/lib/shared/work/artifact.test.mts
        pattern: 'strategicReviewIds skips a heading that quotes the flag in backticks'
    tests: true
    drive: false
---
# Order: Backticked review flags are not flags

## Problem

`picket close` named D-003 of the consulting order (`work/20261030-consulting-the-brief-and-the-prompt-hook/order.md:108`) for strategic review only because its heading quotes `[STRATEGIC REVIEW NEEDED]` in backticks. Both flag scans test the raw line with `includes`: `strategicReviewIds` in `src/lib/shared/work/artifact.mts:82` for order and design records, and `reportFindings` in `src/lib/shared/work/report.mts:12` for research reports, which `close.mts:133` and `close.mts:146` feed into the closing block. The binding constraint is that a bare flag on an id line keeps counting exactly as today, so every close without a quoted flag prints what it prints now. The working tree already holds the change, unstaged; this order adopts it as phase 1.

## Decisions

### D-001: A flag inside a backtick code span is a quotation, not a flag
**Decision:** One exported predicate, `carriesFlag(line: string, flag: string): boolean`, in `src/lib/shared/work/report.mts` next to the flag constants, removes every single-backtick code span (`` /`[^`]*`/g ``) from the line and then checks `includes(flag)`. `reportFindings` uses it for both the architect and the strategic flag, and `strategicReviewIds` imports it alongside `STRATEGIC_REVIEW`, which `artifact.mts` already imports from `report.mts`. A record that wants to name the flag in prose quotes it in backticks; a record that raises it writes it bare. This gives up counting a flag someone deliberately wrapped in backticks, which no template or agent shell asks for.
**Instead of:** a strict position rule (the flag must sit at a fixed place after the id or confidence marker): it would also reject today's valid placements on `### D-###` headings and `- **OQ-###**` lines, which D-003 of the consulting order leaves free on the line.
**Risks:**
- **RISK-001** A double-backtick span that holds a backtick (``` ``a ` b`` ```) is not stripped as one span, so a flag inside such a span could still count. Mitigation: none needed now; no record writes the flag that way, and the failure mode is the current behaviour.
- **RISK-002** An unmatched single backtick before a bare flag leaves the line unstripped, so the flag counts. Mitigation: that is the safe direction, a false flag shows in `picket close` rather than a real one going silent.

### D-002: Fix the base failure of the path scan in this phase
**Decision:** `npm test` fails on base `af6ff98`: `test/repo/markdown-paths.test.mjs:167` rejects four short paths (`ordering/steps/open.md`, `designing/steps/open.md`, `researching/steps/outline.md`, `expediting/SKILL.md`) cited in `.claude/agent-memory/picket-developer/lane-open-line-pinned.md`, which that commit added. The phase rewrites them as the full repo paths under `src/skills/`, all four of which exist, so the phase's `tests` must_have can pass. This gives up a commit that holds only the flag fix.
**Instead of:** an open question that leaves `tests: true` failing until a separate item lands: the phase could not pass `picket verify`, and the fix is one line.
**Risks:**
- **RISK-003** The developer agent's memory changes under it. Mitigation: only the four citations change; the fact and its how-to-apply line stay as written.

## Scope

**In:**
- `carriesFlag` in `report.mts`, used by `reportFindings` and `strategicReviewIds`.
- One unit test per scan for a backticked flag.
- The four short citations in `lane-open-line-pinned.md` (D-002).

**Out:**
- The shape of `picket close` output and `close.mts`, which stay as they are.
- Rewording the consulting order's D-003 heading or any other record.
- Fenced code blocks spanning lines: the scans only read id lines, and an id line inside a fence is out of reach of this fix.

## Phase 1: Strip code spans before the flag check

**Touch set:**
- `src/lib/shared/work/report.mts`: add and use `carriesFlag`
- `src/lib/shared/work/artifact.mts`: strategic scan uses `carriesFlag`
- `src/lib/shared/work/report.test.mts`: backticked finding flags test
- `src/lib/shared/work/artifact.test.mts`: backticked decision heading test
- `src/lib/verbs/close/close.mts`: caller, read only, unchanged
- `.claude/agent-memory/picket-developer/lane-open-line-pinned.md`: four citations to full paths
- `test/repo/markdown-paths.test.mjs`: failing scan, read only

**Changes:** Keep the working tree change as it stands: `CODE_SPAN` and the exported `carriesFlag` in `report.mts`, the `flagged` helper in `reportFindings` calling it, `strategicReviewIds` filtering with `carriesFlag(line, STRATEGIC_REVIEW)`, and the two new tests. In the memory file, write `src/skills/ordering/steps/open.md`, `src/skills/designing/steps/open.md`, `src/skills/researching/steps/outline.md` and `src/skills/expediting/SKILL.md` in place of the short paths (D-002). Stage the five files; no other path changes.

**Done when:**
- **T-1.1** `carriesFlag` is exported from `src/lib/shared/work/report.mts`, and no `includes(STRATEGIC_REVIEW)` or `line.includes(flag)` remains in `report.mts` or `artifact.mts`.
- **T-1.2** `reportFindings` on the lines ``- **R-001** [VERIFIED] the shell names `[ARCHITECT REVIEW NEEDED]` `` and ``- **R-002** [VERIFIED] the template quotes `[STRATEGIC REVIEW NEEDED]` `` returns `{ findings: 2, architect_review: [], strategic_review: [] }`.
- **T-1.3** `strategicReviewIds` on ``### D-003: One flag, `[STRATEGIC REVIEW NEEDED]`, on the line that carries the id`` returns `[]`.
- **T-1.4** Both new tests fail when `carriesFlag` is replaced by a plain `includes` (red), and pass with it (green); the developer's block shows both runs.
- **T-1.5** The existing tests that flag bare `[ARCHITECT REVIEW NEEDED]` and `[STRATEGIC REVIEW NEEDED]` on finding, decision and open question lines pass unchanged.
- **T-1.6** `strategicReviewIds` over the body of `work/20261030-consulting-the-brief-and-the-prompt-hook/order.md` returns `[]`.
- **T-1.7** `npm test` passes, the markdown path scan included.

## Open questions

none

## Revision log
