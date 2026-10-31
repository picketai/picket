---
kind: design
lane: design
title: Lessons from a consumer project's memory
date: 2026-10-31
audience: developer
sources: [request, preflight, artifacts/refactor/21-lessons-from-use.md, artifacts/reports/picket-candidates-from-development-memory-2026-10-30.md, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, src/agents/analyst.md, src/agents/architect.md, src/agents/developer.md, src/skills/implementing/SKILL.md, src/skills/reviewing/SKILL.md, src/skills/reviewing/checklists/alignment.md, src/skills/reviewing/checklists/crosscheck.md, src/skills/resuming/SKILL.md, src/skills/ticketing/steps/jira.md, src/rules/work-items.md, src/lib/hooks/guard/block/index.mts, src/lib/hooks/guard/scope/index.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/powershell.mts, src/lib/hooks/lint/schema/index.mts, src/lib/shared/work/artifact.mts, src/lib/shared/work/block.mts, src/lib/shared/checkouts.mts, src/lib/shared/checks.mts, src/lib/shared/context.mts, src/lib/shared/tooling.mts, src/lib/shared/transcript/entries.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/check/index.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/run.mts, src/lib/verbs/drive/server.mts, src/lib/verbs/drive/side-effects.mts, src/lib/hooks/inject/rules/index.mts, test/timing/budgets.test.mjs]
phases:
  - n: 1
    files: [src/agents/analyst.md, src/agents/architect.md, src/agents/developer.md, src/rules/prose.md, src/rules/tests.md]
    greps:
      - path: src/agents/analyst.md
        pattern: "past the first guard"
      - path: src/agents/analyst.md
        pattern: "the reading is in doubt, not the evidence"
      - path: src/agents/architect.md
        pattern: "three sources agreeing on a figure is not a derivation"
      - path: src/agents/architect.md
        pattern: "rebuild the whole enumeration from the code's write sites"
      - path: src/agents/architect.md
        pattern: "names the before-image, captured on the base"
      - path: src/agents/developer.md
        pattern: "capture the evidence the phase names with read-only commands"
      - path: src/rules/prose.md
        pattern: "stop at the quotation mark"
      - path: src/rules/tests.md
        pattern: "the design makes impossible"
    tests: true
    drive: false
    security: false
  - n: 2
    files: [src/skills/implementing/SKILL.md, src/skills/reviewing/SKILL.md, src/skills/reviewing/checklists/alignment.md, src/skills/reviewing/checklists/crosscheck.md, src/skills/resuming/SKILL.md, src/skills/ticketing/steps/jira.md]
    greps:
      - path: src/skills/implementing/SKILL.md
        pattern: "git diff --numstat"
      - path: src/skills/implementing/SKILL.md
        pattern: "proves the failure, not the ticket's explanation"
      - path: src/skills/reviewing/SKILL.md
        pattern: "Recompute a number or ratio"
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: "captured before-image"
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: "RISK-002 then RISK-004"
      - path: src/skills/ticketing/steps/jira.md
        pattern: "Ticket updated: <time>"
      - path: src/skills/resuming/SKILL.md
        pattern: "Ticket updated:"
    tests: true
    drive: false
    security: false
  - n: 3
    files: [src/lib/hooks/guard/block/index.mts, test/hooks/guard.block.test.mjs, src/skills/implementing/SKILL.md]
    greps:
      - path: src/lib/hooks/guard/block/index.mts
        pattern: "configuration"
      - path: test/hooks/guard.block.test.mjs
        pattern: "blocked: environment: "
      - path: src/skills/implementing/SKILL.md
        pattern: 'blocked: <data \| configuration \| environment>: <what>'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/work/artifact.mts, src/lib/shared/work/artifact.test.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, src/lib/hooks/lint/schema/index.mts, test/hooks/lint.schema.test.mjs, src/agents/architect.md, src/skills/reviewing/checklists/alignment.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md]
    greps:
      - path: src/lib/shared/work/artifact.mts
        pattern: "export function deferredCriteria\\("
      - path: src/lib/shared/work/artifact.mts
        pattern: "export function malformedDeferrals\\("
      - path: src/lib/verbs/close/close.mts
        pattern: "deferred"
      - path: src/lib/verbs/close/block.mts
        pattern: "Deferred: "
      - path: src/lib/hooks/lint/schema/index.mts
        pattern: "malformedDeferrals"
      - path: src/agents/architect.md
        pattern: "\\[DEFERRED: <owner>, <gate>\\]"
      - path: src/skills/reviewing/checklists/alignment.md
        pattern: "DEFERRED"
      - path: src/skills/ordering/SKILL.md
        pattern: "Deferred: "
      - path: src/skills/designing/SKILL.md
        pattern: "Deferred: "
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/shared/work/artifact.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/verify/index.test.mts, src/lib/hooks/lint/schema/index.mts, test/hooks/lint.schema.test.mjs, src/skills/documenting/templates/order.md, src/skills/documenting/templates/design.md, src/agents/architect.md]
    greps:
      - path: src/lib/verbs/verify/index.mts
        pattern: "absent"
      - path: src/lib/hooks/lint/schema/index.mts
        pattern: "absent: true"
      - path: src/skills/documenting/templates/order.md
        pattern: "absent:"
      - path: src/skills/documenting/templates/design.md
        pattern: "absent:"
      - path: src/agents/architect.md
        pattern: "A grep targets what any correct implementation must contain"
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/hooks/guard/scope/index.mts, test/hooks/guard.scope.test.mjs, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/agents/developer.md]
    greps:
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: "already exists; read it before writing"
      - path: src/lib/hooks/guard/bash/payloads.mts
        pattern: "export function deletesInsideWrapper\\("
      - path: src/lib/hooks/guard/bash/judge.mts
        pattern: "deletesInsideWrapper"
      - path: src/lib/hooks/guard/bash/payloads.test.mts
        pattern: "cmd //c del"
      - path: src/agents/developer.md
        pattern: "never delete it through another shell"
    tests: true
    drive: true
    security: true
  - n: 7
    files: [src/lib/shared/checkouts.mts, src/lib/shared/checkouts.test.mts, src/lib/verbs/check/index.mts, src/lib/verbs/check/index.test.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/run.mts, src/lib/verbs/drive/server.mts, src/lib/verbs/drive/index.test.mts]
    greps:
      - path: src/lib/shared/checkouts.mts
        pattern: "export function workingCheckout\\("
      - path: src/lib/verbs/check/index.mts
        pattern: "workingCheckout"
      - path: src/lib/verbs/drive/index.mts
        pattern: "workingCheckout"
    tests: true
    drive: true
    security: false
---
# Design: Lessons from a consumer project's memory

## Problem

`artifacts/refactor/21-lessons-from-use.md` (approved 2026-10-31) implements every outcome of `artifacts/reports/picket-candidates-from-development-memory-2026-10-30.md`, `## Walkthrough outcomes`: instruction text for items 1 to 18 and K4, kernel checks for items 3, 6 and 8, guard fixes for item 13 and K1, and `picket check` and `picket drive` in a nested checkout (K3). The report holds each instruction's exact wording once; this record cites it by item and never restates it. Binding constraints: the budgets in `test/timing/budgets.test.mjs` (agent shell 120 lines, SKILL.md 150, injected rules 10,000 characters, measured at 8,889 today and 9,513 after K4 and item 14), SDR-00001 D-003 (rules reach every agent by injection, so the rule files stay small), and `test/repo/private-terms.test.mjs`: examples stay neutral (orders, a shop), nothing from the consumer project.

## Decisions

### D-001: Exact text from the report; each prose half ships with its check
**Decision:** Every instruction change copies its outcome's text from the report verbatim, at the place the outcome names. Prose that only describes a kernel contract (the `blocked:` kinds of item 3, the `[DEFERRED: <owner>, <gate>]` marker of item 6, `absent: true` of item 8, the `picket leave` sentence of K1) ships in the same phase as the code that accepts it, so no phase tells an agent to write something the kernel still bounces or ignores. Infrastructural decision.
**Instead of:** one prose phase holding every item, as the draft's split suggests: an agent following it before the kernel phases land writes `absent: true`, which `picket verify` ignores today and fails, or a `blocked:` kind nothing checks yet.
**Risks:**
- **RISK-001** The rule additions push the injected rules past the 10,000-character limit. Mitigation: measured with a script on the current `src/rules/` files joined as `joinedRules` joins them: 8,889 now, 9,513 with K4 and item 14; `test/timing/budgets.test.mjs` fails the phase if a later edit crosses the limit.
- **RISK-002** Item 4 trims the premise rule from `architect.md:37` (Constraints, both lanes) and widens the copy at line 71, which sits under `### Design`; the order lane then keeps only line 56's "Verify a premise about existing code". Mitigation: OQ-001 puts the placement to the user; phase 1 follows the report meanwhile.

### D-002: Blocked kinds are checked by guard.block on the developer's phase block
**Decision:** `proofProblems` in `src/lib/hooks/guard/block/index.mts` reads the `Verified:` field (already in `BLOCK_FIELDS.phase`) of a developer `PHASE DONE` block. A value starting `blocked` must match `blocked: <data|configuration|environment>: <non-empty text>`; any other `blocked` form bounces with a message naming the three kinds and saying a different request shape is not a block. The other two forms (`<command> → <result>`, `no drivable surface: <reason>`) and a missing `Verified:` line are unchanged. The fast lane's `## Expedited:` block stays unchecked, as it is for `Red:` and `Root cause:`. Infrastructural decision.
**Instead of:** a check in `picket route` when the verdict lands: the agent's turn has ended by then, while a Stop-hook bounce lets it fix the line in the same turn, as `Red:` already does.
**Risks:**
- **RISK-003** An agent writes a near kind (`blocked: env: ...`) and is bounced. Mitigation: the bounce names the three exact words, and a test pins the message.

### D-003: Deferred criteria are a marker after the id, parsed in one place
**Decision:** A deferral is written `- **T-N.x** [DEFERRED: <owner>, <gate>] <criterion>`. `src/lib/shared/work/artifact.mts` gains `type Deferral = { id: string; owner: string; gate: string }`, `deferredCriteria(body): Deferral[]` (the marker must follow the id directly; owner runs to the first comma, gate to the closing bracket) and `malformedDeferrals(body): string[]` (ids of criterion lines that carry `[DEFERRED` outside code spans, using the same stripping as `carriesFlag`, but fail the full form). `Closing` in `src/lib/verbs/close/close.mts` gains `deferred: Deferral[]`, filled for the order and design lanes and `[]` otherwise; `closingBlock` prints one `Deferred: <id> <owner>, <gate>` line per deferral, right after `Questions:`. `lint.schema` reports each malformed id. The criteria count in `capProblems` is unchanged because the marker sits after the id.
**Instead of:** a `deferred:` list in each phase's frontmatter entry: the reviewer quotes criteria verbatim, so the deferral would sit apart from the text it qualifies and the two copies could drift.
**Risks:**
- **RISK-004** An architect defers a hard criterion to get past it. Mitigation: the reviewer grades DEFERRED only on a marked row, an unmarked unverifiable criterion is FAIL (item 6's `alignment.md` text), and every deferral reaches the user in the closing block.
- **RISK-005** A record that mentions the marker in prose (this one does) is flagged by lint. Mitigation: code spans are skipped; a test pins a backticked marker as not malformed.

### D-004: Negative greps are a field, not a lookahead
**Decision:** `GrepEntry` gains `absent?: boolean` (in `artifact.mts` and the lint's local type). `grepResults` in `src/lib/verbs/verify/index.mts` computes the present match as today and returns `ok = absent ? !present : present`, with the result named `absent:<path>:<pattern>` and the detail `file missing` when it passes because the file does not exist. `grepProblems` in `lint.schema` flags a non-boolean `absent` and a pattern starting `^(?!` ("write it as absent: true with the plain pattern"). Records already written are not migrated: `lint.schema` runs only on the record being written. Infrastructural decision.
**Instead of:** keeping the lookahead and documenting its `flags: i` workaround: under the default `m` flag `^(?![\s\S]*X)` passes with X present, which already produced a check that could never fail.
**Risks:**
- **RISK-006** An absent grep with a mistyped path passes because the file is missing. Mitigation: the `file missing` detail shows on every `picket verify` run, and the architect text of item 8 tells the author to try the pattern on a line a correct phase would hold.
- **RISK-007** An amendment to an open older record trips the new `^(?!` lint. Mitigation: that is the intended nudge; the message says how to rewrite the entry.

### D-005: Read-before-write covers Write on an existing file
**Decision:** `editsUnreadFile` in `src/lib/hooks/guard/scope/index.mts` also returns true for `tool_name === "Write"` when the target exists on disk and `wasRead` finds neither a Read nor an earlier write of it in the agent's transcript. The Write denial reads `<rel> already exists; read it before writing, or the plan's new file is not new`; the Edit denial is unchanged. Infrastructural decision.
**Instead of:** item 13's original prose (confirm with `git ls-files` before writing a new file): the hook can decide it, and Glob's blind spot for gitignored worktree paths no longer matters.
**Risks:**
- **RISK-008** An agent regenerating a file it never read is denied. Mitigation: one Read clears it, and `wasRead` already counts the agent's own earlier writes, so a file it created in the session passes.

### D-006: A delete wrapped in cmd or PowerShell is classified as a delete
**Decision:** `src/lib/hooks/guard/bash/payloads.mts` exports `deletesInsideWrapper(seg: Segment, depth?: number): boolean`. It reuses `metaPayload` for the hosts `cmd`, `powershell` and `pwsh` only; a cmd payload's text is split on `&`, `&&`, `|` and `||`, a PowerShell payload is read with `readPowerShell`; it returns true when an inner command name, case-insensitive after `normalizeRoot`, is one of `del`, `erase`, `rd`, `rmdir`, `rm`, `Remove-Item` or `ri`, and recurses through a nested host up to `MAX_SUBSTITUTION_DEPTH`. `CMD_RUN_FLAG` also accepts `//c`, the Git Bash spelling of `/c`. `judgeSegments` in `judge.mts` records `deny` for a segment where it returns true, so both dialects' existing denial text and the `PICKET_ESCALATE` path apply unchanged. Infrastructural decision.
**Instead of:** a `check` rule for `cmd` and `pwsh` in `ROOTS` (`rules.mts`): payload parsing lives in `payloads.mts`, which imports `rules.mts`, so the rule would need an import cycle. It gives up two things: `sh -c`, `eval`, `xargs` and `env` wrappers keep their current class, and a wrapped worktree teardown is denied where a bare `rm` of one is left to the prompt.
**Risks:**
- **RISK-009** A wrong match denies a safe command on every Bash call. Mitigation: tests pin `cmd //c mklink`, `cmd /c dir` and `pwsh -c Get-ChildItem` at their current class.
- **RISK-010** Accepting `//c` also lets the lead-only and code-write checks read `cmd //c` payloads. Mitigation: intended, it closes the same bypass for them; the existing payload tests run unchanged.

### D-007: check and drive run in the checkout that holds the working directory
**Decision:** `src/lib/shared/checkouts.mts` gains `workingCheckout(root: string, cwd: string): string`: the git top level of `cwd` as a project-root-relative POSIX path, or `""` when it equals the root, lies outside it, or git finds none. `picket check` detects tooling in `join(root, dir)` and runs each step with `cwd` there and the log prefix `check-<dir with slashes as dashes>`, as `checkoutTests` does; `CheckReport` gains `checkout: string`, rendered as a `checkout: <dir>` line when non-empty. `picket drive` runs `--run`, detects and runs `--start`, and snapshots and restores side effects in that checkout, reporting their paths project-root relative; the drive log row and `.picket/state/` stay at the root. No new flag. Infrastructural decision.
**Instead of:** a `--checkout <dir>` flag: callers already stand in the checkout, and `verify` resolves a checkout without one.
**Risks:**
- **RISK-011** On Windows, git's top level and the project root differ in drive-letter case or slashes, so a nested checkout looks outside the root and the umbrella runs. Mitigation: compare with `path.relative` after `resolve`, and a test drives the fixture through the same comparison.

## Scope

**In:**
- Instruction text of items 1 to 18 (except 13, now code) and K1, K4, at the places the outcomes name.
- `guard.block` blocked kinds, deferred criteria at close and in `lint.schema`, `absent` greps in `verify` and `lint.schema`, `guard.scope` on Write, `guard.bash` wrapped deletes, `check` and `drive` in a nested checkout, each with unit tests.
- The order and design templates showing `absent`; the ordering and designing closing templates showing `Deferred:`.

**Out:**
- Old work item records and their lookahead greps (D-004), git history, the consumer project.
- The fast lane bench: offered after the cumulative review, since items 3, 6, 8 and K1 change contracts.
- `src/rules/work-items.md`: it names `greps` but not its fields, so the draft's condition for touching it does not hold.

## Phase 1: Agent shells and rules
**Touch set:**
- `artifacts/reports/picket-candidates-from-development-memory-2026-10-30.md`: exact text, read only
- `src/agents/analyst.md`: items 1 and 2
- `src/agents/architect.md`: items 4, 5, 7, 9, 17, 18
- `src/agents/developer.md`: item 17 evidence capture
- `src/rules/prose.md`: K4 quotation exemption
- `src/rules/tests.md`: item 14 impossible states
- `test/timing/budgets.test.mjs`: line and character budgets, read only
**Changes:** Insert each outcome's text verbatim from `## Walkthrough outcomes`, at its named place:
- `analyst.md`: item 1 after the marker sentence in Constraints; item 2 in the deep pass after the redirect paragraph.
- `architect.md`: item 17 on the `[IRREVERSIBLE]` sentence (line 33); item 9 on the Touch set paragraph (line 35); item 4's trim of line 37; items 4, 18 and 5 on the Design premise paragraph (line 71); item 7's paragraph after line 77, which stays.
- `developer.md`: item 17's sentence in Constraints.
- `prose.md`: the K4 paragraph; `tests.md`: the item 14 paragraph.
Items 6 and 8's architect text, the K1 developer sentence and every skill or checklist change belong to later phases (D-001). Example text stays as the report gives it.
**Done when:**
- **T-1.1** `src/agents/analyst.md` holds item 1's sentence in `## Constraints` and item 2's sentence in the deep pass, each matching the report character for character.
- **T-1.2** `src/agents/architect.md` holds the text of items 4, 5, 7, 9, 17 and 18 at the places above, and line 37's paragraph keeps "No acceptance criterion may rest on an unverified premise." without the schema, data, legacy and contract list.
- **T-1.3** `src/agents/developer.md` `## Constraints` holds item 17's sentence naming `.picket/state/scratch/<id>/`.
- **T-1.4** `src/rules/prose.md` holds the K4 paragraph and `src/rules/tests.md` the item 14 paragraph, both verbatim.
- **T-1.5** `npm test` passes, including `test/timing/budgets.test.mjs` (architect shell at most 120 lines, injected rules at most 10,000 characters), `test/repo/dashes.test.mjs` and `test/repo/private-terms.test.mjs`.

## Phase 2: Skill steps and checklists
**Touch set:**
- `artifacts/reports/picket-candidates-from-development-memory-2026-10-30.md`: exact text, read only
- `src/skills/implementing/SKILL.md`: items 12, 15, 18
- `src/skills/reviewing/SKILL.md`: item 5 evidence bar step
- `src/skills/reviewing/checklists/alignment.md`: items 9 and 10
- `src/skills/reviewing/checklists/crosscheck.md`: item 11 id gaps
- `src/skills/resuming/SKILL.md`: item 16 ticket freshness
- `src/skills/ticketing/steps/jira.md`: item 16 updated time
**Changes:** Insert each outcome's text verbatim at its named place:
- `implementing/SKILL.md`: items 12 and 15 as two paragraphs in `## Rules`; item 18's sentence in step 2. Item 3's changes to step 6 and the `Verified:` template line wait for phase 3 (D-001).
- `reviewing/SKILL.md`: item 5 as step 6 of the evidence bar, after step 5.
- `alignment.md`: items 9 and 10 in `## Alignment: evidence quality`. Item 6's DEFERRED result waits for phase 4.
- `crosscheck.md`: item 11's sentence on check 5; the heading `## Six checks, in order` stays.
- `jira.md`: in the `--story` pull, step 2 writes `Ticket updated: <time>` (the ticket's `updated` field) as the scratch file's first line, before the description; plain pull step 3 states the updated time with the other loaded fields.
- `resuming/SKILL.md`: item 16's sentence, in step 2 or as a rule.
**Done when:**
- **T-2.1** `src/skills/implementing/SKILL.md` holds item 12's and item 15's paragraphs in `## Rules` and item 18's sentence in step 2, verbatim; its `Verified:` template line is unchanged.
- **T-2.2** `src/skills/reviewing/SKILL.md`'s evidence bar has a step 6 holding item 5's text, and steps 1 to 5 are unchanged.
- **T-2.3** `alignment.md`'s evidence quality section holds item 9's and item 10's text; `crosscheck.md` check 5 holds item 11's sentence and the file still has six numbered checks.
- **T-2.4** `jira.md`'s `--story` pull writes `Ticket updated: <time>` as the first line of `.picket/state/scratch/<KEY>.md` and plain pull step 3 names the updated time; `resuming/SKILL.md` holds item 16's sentence.
- **T-2.5** `npm test` passes, including the budgets, `test/repo/dashes.test.mjs`, `test/repo/markdown-paths.test.mjs` and `test/repo/private-terms.test.mjs`.

## Phase 3: Blocked kinds on the developer block
**Touch set:**
- `src/lib/hooks/guard/block/index.mts`: `proofProblems` reads `Verified:`
- `src/lib/shared/work/block.mts`: `Verified` already a phase field, read only
- `test/hooks/guard.block.test.mjs`: block fixtures and bounce asserts
- `src/skills/implementing/SKILL.md`: line 60 template, step 6
**Changes:** Per D-002. In `guard/block/index.mts`, a constant for the three kinds and a pattern for the full form; `proofProblems` adds one problem when `fieldValue(lines, "Verified")` starts with `blocked` and fails the form. The bounce text names `data`, `configuration` and `environment` and says a request that needs another shape or route is not a block. In `implementing/SKILL.md`, the `Verified:` template line and step 6 take item 3's text verbatim.
**Done when:**
- **T-3.1** A developer `PHASE DONE` block with `Verified: blocked: data: <text>`, one with `configuration:` and one with `environment:` each pass `guard.block` (one test per kind).
- **T-3.2** `Verified: blocked: seed rows missing` and `Verified: blocked: env: no database` each bounce, and the bounce text holds `data`, `configuration` and `environment`.
- **T-3.3** `Verified: npm run cli -- list → exit 0` and `Verified: no drivable surface: pure function` pass, and a block with no `Verified:` line gets no new problem.
- **T-3.4** An `## Expedited:` block with `Verified: blocked: seed rows missing` is not bounced.
- **T-3.5** `implementing/SKILL.md`'s `Verified:` template line and step 6 hold item 3's text verbatim.
- **T-3.6** `npm test` passes, and a drive runs the built `dist/hooks/guard.block.mjs` on a `SubagentStop` payload whose transcript ends in a bare `blocked:` block and observes the bounce.

## Phase 4: Deferred criteria
**Touch set:**
- `src/lib/shared/work/artifact.mts`: `Deferral`, parser, malformed ids
- `src/lib/shared/work/artifact.test.mts`: parser tests
- `src/lib/verbs/close/close.mts`: `Closing.deferred`
- `src/lib/verbs/close/block.mts`: `Deferred:` lines after `Questions:`
- `src/lib/verbs/close/index.test.mts`: closing block tests
- `src/lib/hooks/lint/schema/index.mts`: malformed marker problem
- `test/hooks/lint.schema.test.mjs`: lint tests
- `src/agents/architect.md`: item 6 sentence
- `src/skills/reviewing/checklists/alignment.md`: DEFERRED result, table, severity
- `src/skills/ordering/SKILL.md`: closing template line
- `src/skills/designing/SKILL.md`: closing template line
**Changes:** Per D-003. `artifact.mts` exports `Deferral`, `deferredCriteria(body)` and `malformedDeferrals(body)`, both line-based and skipping code spans as `carriesFlag` does. `close.mts` fills `deferred` in `closingFacts` for `PHASED_LANES`, `[]` otherwise. `block.mts` maps each deferral to `Deferred: <id> <owner>, <gate>` directly after the `Questions:` entry. `lint.schema` adds one problem per malformed id: `<id>: write a deferral as [DEFERRED: <owner>, <gate>] right after the id`. Prose: item 6's sentence on the architect's Touch set paragraph; in `alignment.md`, step 4's DEFERRED result, the table's Result cell and a severity row that does not block, as item 6 gives; both closing templates gain `Deferred: <id> <owner>, <gate>` (one line per deferred criterion, when the plan marks some) after `Questions:`.
**Done when:**
- **T-4.1** `deferredCriteria` on a body holding `- **T-5.4** [DEFERRED: QA, before go-live] the mail renders in a real client` returns `[{ id: "T-5.4", owner: "QA", gate: "before go-live" }]`; a marker placed after other criterion text or inside backticks is not returned.
- **T-4.2** `malformedDeferrals` returns `T-2.1` for `- **T-2.1** [DEFERRED: QA] x` and for `- **T-2.1** [DEFERRED] x`, and nothing for a well-formed marker or one inside a code span.
- **T-4.3** `lint.schema` on a design record whose phase has three criteria, one malformed deferral, reports that id with the form; with the deferral well-formed it reports nothing and the phase still counts three criteria.
- **T-4.4** `closingBlock` for a design close with one deferral prints `Deferred: T-5.4 QA, before go-live` on the line after `Questions:`; a fast and a research close carry `deferred: []` and print no `Deferred:` line.
- **T-4.5** `architect.md` holds item 6's sentence; `alignment.md` has the DEFERRED result in step 4, `DEFERRED` in the table's Result cell and a severity row marking it as not blocking.
- **T-4.6** `ordering/SKILL.md` and `designing/SKILL.md` closing templates show the `Deferred:` line directly after `Questions:`.
- **T-4.7** `npm test` passes, and a drive runs the built `picket close` on a temporary project whose design record defers one criterion and observes the `Deferred:` line.

## Phase 5: Negative greps as absent
**Touch set:**
- `src/lib/shared/work/artifact.mts`: `GrepEntry.absent`
- `src/lib/verbs/verify/index.mts`: `grepResults` absent branch
- `src/lib/verbs/verify/index.test.mts`: verify tests
- `src/lib/hooks/lint/schema/index.mts`: `grepProblems` checks
- `test/hooks/lint.schema.test.mjs`: lint tests
- `src/skills/documenting/templates/order.md`: optional `absent` key
- `src/skills/documenting/templates/design.md`: optional `absent` key
- `src/agents/architect.md`: item 8 sentence, order step 1
**Changes:** Per D-004. `GrepEntry` gains `absent?: boolean` in `artifact.mts` and in the lint's local type. `grepResults` keeps today's present check and inverts it for `absent: true`, naming the result `absent:<path>:<pattern>` and adding the detail `file missing` when the file does not exist. `grepProblems` adds `phases[n=<n>] grep absent must be true or false` and, for a pattern starting `^(?!`, `phases[n=<n>] grep pattern <pattern> is a whole-file lookahead; write it as absent: true with the plain pattern`. Both templates show `absent` under the grep entry as an optional key with a placeholder saying to set it true when the text must not appear and to omit it otherwise. Item 8's sentence joins the architect's order step 1 (the frontmatter step that names `greps`).
**Done when:**
- **T-5.1** `verify` with `absent: true` passes when the pattern does not match, passes with detail `file missing` when the file does not exist, and fails when the pattern matches; its result name starts `absent:`.
- **T-5.2** A grep entry without `absent` gives the same results as before: a match passes, no match fails, a missing file fails.
- **T-5.3** `lint.schema` flags `absent: "yes"` and the pattern `^(?![\s\S]*metres)` with the rewrite message, and reports nothing for `absent: true` with the pattern `\bmetres\b`.
- **T-5.4** Both templates show `absent` as an optional grep key, and `architect.md`'s order step 1 holds item 8's sentence verbatim.
- **T-5.5** `npm test` passes, and a drive runs the built `picket verify <id> <n> --no-tests` on a temporary item with one `absent` grep and observes it pass, then fail after the text is added.

## Phase 6: Unread overwrites and wrapped deletes
**Touch set:**
- `src/lib/hooks/guard/scope/index.mts`: `editsUnreadFile`, Write denial text
- `src/lib/shared/transcript/entries.mts`: `wasRead` semantics, read only
- `test/hooks/guard.scope.test.mjs`: Write cases
- `src/lib/hooks/guard/bash/payloads.mts`: `deletesInsideWrapper`, `CMD_RUN_FLAG`
- `src/lib/hooks/guard/bash/judge.mts`: deny for a wrapped delete
- `src/lib/hooks/guard/bash/rules.mts`: `DENIED_NAMES`, `META_NAMES`, read only
- `src/lib/hooks/guard/bash/payloads.test.mts`: wrapped form tests, both dialects
- `src/agents/developer.md`: K1 sentence
**Changes:** Per D-005 and D-006. `editsUnreadFile` takes the existence check for Write; `denialReason` picks the Write text for a Write and keeps the Edit text. `payloads.mts` exports `deletesInsideWrapper`, built on `metaPayload` and `payloadParse`; `CMD_RUN_FLAG` becomes `/^\/\/?c$/i`. In `judgeSegments`, a segment for which `deletesInsideWrapper(leadingAssignments(seg).command)` is true is recorded as `deny`, so the denial comes from `dialect.hints.denial` and an escalating command goes through `judgeEscalation`. Base behaviour, probed on 2026-10-31 with the built `dist/hooks/guard.bash.mjs`: every wrapped form in T-6.2 and T-6.3 gets no decision, and `rm a.txt` is denied. The K1 sentence joins `developer.md`'s Constraints verbatim.
**Done when:**
- **T-6.1** `guard.scope` denies a Write to an existing file the transcript never read, with a reason holding `already exists; read it before writing`, and allows a Write to an existing file read earlier and a Write to a new path.
- **T-6.2** `guard.bash` denies `cmd //c del a.txt`, `cmd.exe /c erase a.txt`, `cmd /c "rd /s /q build"`, `pwsh -Command Remove-Item a.txt` and `powershell -c "ri a.txt"` from the Bash tool, and `cmd /c del a.txt` from the PowerShell tool, each with its dialect's destructive denial text.
- **T-6.3** `cmd //c mklink b a`, `cmd /c dir` and `pwsh -c Get-ChildItem` still get no decision, as in the base probe.
- **T-6.4** `PICKET_ESCALATE="you asked" cmd //c del a.txt` run alone gets the same decision as `PICKET_ESCALATE="you asked" rm a.txt`.
- **T-6.5** `developer.md`'s Constraints hold the K1 sentence verbatim.
- **T-6.6** `npm test` passes, and a drive feeds the built `dist/hooks/guard.bash.mjs` a `PreToolUse` payload for `cmd //c del a.txt` and observes `deny`.

## Phase 7: check and drive in a nested checkout
**Touch set:**
- `src/lib/shared/checkouts.mts`: `workingCheckout`, beside `testRuns`
- `src/lib/shared/checkouts.test.mts`: git fixture helpers exist here
- `src/lib/shared/context.mts`: `ctx.cwd` source, read only
- `src/lib/shared/checks.mts`: `runStep` `cwd` option, read only
- `src/lib/verbs/check/index.mts`: tooling and steps in the checkout
- `src/lib/verbs/check/index.test.mts`: two-checkout tests
- `src/lib/verbs/drive/index.mts`: snapshot, restore and row
- `src/lib/verbs/drive/run.mts`: `--run` working directory
- `src/lib/verbs/drive/server.mts`: start detection and working directory
- `src/lib/verbs/drive/side-effects.mts`: snapshot paths, read only
- `src/lib/verbs/drive/index.test.mts`: nested drive test
**Changes:** Per D-007. `workingCheckout(root, cwd)` reads `git rev-parse --show-toplevel` at `cwd` through `gitRead`. `runChecks` resolves `dir = workingCheckout(root, ctx.cwd)`, calls `detectTooling(join(root, dir))`, and passes `cwd` and the log prefix to `runStep`; logs stay under the root's `.picket/state/`. `CheckReport` gains `checkout`, and `renderCheck` prints `checkout: <dir>` before the steps when it is not empty. `runMode` and `serverMode` take the checkout's absolute directory for their working directory and for start detection; `driveOnce` snapshots and restores side effects in it and prefixes the reported paths with `dir`. `appendDriveRow` keeps `ctx.root`. Usage strings do not change.
**Done when:**
- **T-7.1** `workingCheckout` returns `""` for the root itself, for a folder outside the root and for a folder in no repository, `app` for a folder inside a nested repository `app/`, and `app/.worktrees/x` for a worktree of it.
- **T-7.2** On a fixture whose root and nested `app/` each define a test command that writes its own marker file, `runChecks` with `cwd` in `app/` writes only app's marker and reports `checkout: app`; with `cwd` at the root it writes only the root's marker and reports an empty checkout.
- **T-7.3** With `cwd` in a nested checkout that defines no tooling, `runChecks` reports the test step as `none detected` and the root's marker is not written.
- **T-7.4** The nested `check` log is written under the root's `.picket/state/` with the prefix `check-app`, and none is written under `app/`.
- **T-7.5** `drive --run` with `cwd` in `app/` runs with `app/` as its working directory, appends its row to the root's drive log, and reports a file it created in `app/` as `app/<file>` removed.
- **T-7.6** `npm test` passes, and a drive runs the built `picket check --steps test` from a nested checkout of a temporary project and observes the nested test command.

## Open questions
- **OQ-001** Item 4 removes the premise rule from `architect.md:37`, which both lanes read, and keeps the widened copy at line 71 under `### Design`, so an order-lane architect loses the schema, data, legacy and contract list and the example check. Should the widened rule sit at line 37 instead, with line 71 dropped? Owner: the user. Fallback: phase 1 follows the report as approved.

## Revision log
