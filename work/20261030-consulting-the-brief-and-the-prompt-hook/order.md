---
kind: order
lane: order
title: Consulting, the brief and the prompt hook
date: 2026-10-30
audience: developer
sources: [work/20261030-consulting-the-brief-and-the-prompt-hook/request.md, artifacts/refactor/17-consulting.md, src/skills/consulting/SKILL.md, src/skills/consulting/steps/discuss.md, src/skills/understanding/SKILL.md, src/skills/understanding/steps/10-prepare.md, src/skills/understanding/steps/20-interview.md, src/skills/understanding/steps/30-capture.md, src/.claude-plugin/plugin.json, src/skills/documenting/SKILL.md, src/skills/explaining/steps/gather.md, docs/how-to.md, docs/reference/skills.md, test/repo/skills.test.mjs, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/support/routing.mts, src/templates/claude-block.md, CLAUDE.md, src/lib/verbs/open/index.mts, src/lib/verbs/open/index.test.mts, src/lib/shared/work/state.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/lib/shared/work/next-view.mts, src/lib/shared/work/files.mts, test/support/snapshot.mts, test/repo/agents.test.mjs, src/agents/analyst.md, src/agents/architect.md, src/skills/documenting/templates/report.md, src/skills/documenting/templates/design.md, src/skills/ordering/SKILL.md, src/skills/ordering/steps/open.md, src/skills/designing/SKILL.md, src/skills/designing/steps/open.md, src/skills/researching/SKILL.md, src/skills/researching/steps/outline.md, src/lib/hooks.mts, src/lib/hooks/hook-spec.mts, src/lib/hooks/output.mts, src/lib/hooks/run-hook.mts, src/lib/hooks/inject/rules/index.mts, src/lib/hooks/inject/rules/index.test.mts, scripts/build.mjs, test/repo/hook-list.test.mjs, test/repo/plugin-layout.test.mjs, test/timing/budgets.test.mjs, src/lib/verbs/reply/table.mts, src/skills/reviewing/checklists/crosscheck.md, src/lib/shared/work/report.mts, src/lib/shared/work/artifact.mts, src/lib/hooks/lint/schema/index.mts, src/lib/hooks/lint/schema/report.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, src/skills/documenting/templates/sdr.md, Claude Code 2.1.314 binary (UserPromptSubmit input carries prompt and an optional source of user, sdk, system, loop_wakeup, schedule_wakeup or poll_event; output takes hookSpecificOutput.additionalContext)]
phases:
  - n: 1
    files: [src/skills/consulting/SKILL.md, src/skills/consulting/steps/discuss.md, src/skills/consulting/steps/interview.md, src/skills/consulting/steps/capture.md, src/.claude-plugin/plugin.json, src/skills/documenting/SKILL.md, src/skills/explaining/steps/gather.md, docs/how-to.md, docs/reference/skills.md, test/repo/skills.test.mjs, test/repo/description-cases.json, src/templates/claude-block.md, CLAUDE.md]
    greps:
      - path: src/skills/consulting/SKILL.md
        pattern: 'steps/interview\.md'
      - path: src/skills/consulting/SKILL.md
        pattern: 'steps/capture\.md'
      - path: src/skills/consulting/SKILL.md
        pattern: 'interview me'
      - path: src/skills/consulting/SKILL.md
        pattern: '\.claude/rules/'
      - path: src/skills/consulting/steps/capture.md
        pattern: '^## Flagged ambiguities'
      - path: src/.claude-plugin/plugin.json
        pattern: '^(?![\s\S]*understanding)'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: 'UNCONVERTED_SKILLS = \["benchmarking", "branching"\]'
      - path: src/templates/claude-block.md
        pattern: 'A direction or strategy question \(should we, which approach\): .picket:consulting.\.'
      - path: CLAUDE.md
        pattern: 'A direction or strategy question \(should we, which approach\): .picket:consulting.\.'
    tests: true
    drive: false
  - n: 2
    files: [src/lib/shared/work/brief.mts, src/lib/shared/work/brief.test.mts, src/lib/verbs/open/index.mts, src/lib/verbs/open/index.test.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, test/support/snapshot.mts, test/repo/agents.test.mjs, src/agents/analyst.md, src/agents/architect.md, src/skills/documenting/templates/report.md, src/skills/ordering/steps/open.md, src/skills/designing/steps/open.md, src/skills/researching/steps/outline.md, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs/open/index.mts
        pattern: '--purpose'
      - path: src/lib/verbs/open/index.mts
        pattern: '--out-of-scope'
      - path: src/lib/shared/work/brief.mts
        pattern: '## Brief'
      - path: src/agents/analyst.md
        pattern: '`out of scope:`'
      - path: src/agents/architect.md
        pattern: '`out of scope:`'
      - path: src/skills/documenting/templates/report.md
        pattern: 'Scope as understood'
      - path: src/skills/ordering/steps/open.md
        pattern: '--in-scope'
      - path: src/skills/designing/steps/open.md
        pattern: '--in-scope'
      - path: src/skills/researching/steps/outline.md
        pattern: '--in-scope'
      - path: docs/reference/cli.md
        pattern: '--out-of-scope'
    tests: true
    drive: true
  - n: 3
    files: [src/lib/hooks.mts, src/lib/hooks/hook-spec.mts, src/lib/hooks/inject/consulting/index.mts, src/lib/hooks/inject/consulting/index.test.mts, test/repo/hook-list.test.mjs, test/repo/plugin-layout.test.mjs, docs/reference/hooks.md, src/agents/architect.md, src/agents/analyst.md, src/skills/reviewing/checklists/crosscheck.md, src/lib/shared/work/report.mts, src/lib/shared/work/report.test.mts, src/lib/shared/work/artifact.mts, src/lib/shared/work/artifact.test.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, src/skills/researching/SKILL.md, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/documenting/templates/report.md, src/skills/documenting/templates/design.md]
    greps:
      - path: src/lib/hooks.mts
        pattern: '"UserPromptSubmit"'
      - path: src/lib/hooks.mts
        pattern: '"inject.consulting"'
      - path: src/lib/hooks/inject/consulting/index.mts
        pattern: 'This reads as a direction question: `picket:consulting` handles it, not a lane'
      - path: test/repo/hook-list.test.mjs
        pattern: '\["UserPromptSubmit", undefined, \["inject.consulting"\]\]'
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: '^## Six checks'
      - path: src/agents/architect.md
        pattern: 'artifacts/strategy/'
      - path: src/agents/architect.md
        pattern: '^(?![\s\S]*\[STRATEGIC\])'
        flags: i
      - path: src/skills/documenting/templates/design.md
        pattern: '^(?![\s\S]*\[STRATEGIC\])'
        flags: i
      - path: src/lib/shared/work/report.mts
        pattern: 'STRATEGIC REVIEW NEEDED'
      - path: src/lib/verbs/close/block.mts
        pattern: 'strategic review: '
      - path: src/skills/researching/SKILL.md
        pattern: 'STRATEGIC REVIEW NEEDED'
    tests: true
    drive: true
---
# Order: Consulting, the brief and the prompt hook

## Problem

Draft 17 (`artifacts/refactor/17-consulting.md`, approved direction D4) asks for four things: `understanding` folded into a lead-only `consulting` with discuss and interview modes; a three-line brief (purpose, in scope, out of scope) that reaches the analyst and the architect through `picket next`; a `UserPromptSubmit` hook that suggests consulting on a direction question; and ratified strategy documents that reach the architect and the cross-check, with a `[STRATEGIC REVIEW NEEDED]` flag that `picket close` names. Binding constraints: the draft's six decisions, the skill shape tests with no new `PENDING` entries, the 200 ms cold hook budget, the 2,560-byte CLAUDE.md budget, and no change to the shape of today's agent messages when no brief is given.

## Decisions

### D-001: The brief is a `## Brief` section of `request.md`
**Decision:** `picket open` takes `--purpose`, `--in-scope` and `--out-of-scope` (all three or none, each one non-empty line, and only with a request) and appends a `## Brief` section to `request.md` after the request text, with the lines `purpose: <p>`, `in scope: <s>`, `out of scope: <o>`. One new module, `src/lib/shared/work/brief.mts`, owns the format: a `Brief` type `{ purpose, in_scope, out_of_scope }`, the section renderer `open` calls, a reader that takes the last `## Brief` section of a request text and returns `Brief | null` (null unless all three keys are there), and the three message lines. `readSnapshot` reads `request.md` once and carries `brief: Brief | null`; `analystSend` and `architectSend` print the three lines after `request:` when the brief is present. `picket admit` still judges the raw request text only. The flags stay optional in the kernel: the lane open steps tell the lead to pass them, and an item opened without them sends exactly today's messages.
**Instead of:** a new `brief.yaml` work file: a second file in `WORK_FILES` and a second reader for three lines, while `request.md` already travels to the cumulative review, which then traces the brief too. Required flags lost because about 30 test and bench callers open phased items without them, and the kernel cannot judge whether the lead should have asked.
**Risks:**
- **RISK-001** The lead forgets the flags and the agents get no brief. Mitigation: the three lane open steps name the flags on the `picket open` line itself, and the shells say the lines come "when the request carries a brief".

### D-002: `inject.consulting` suggests on a fixed phrase list and never routes
**Decision:** A new hook `inject.consulting` on `UserPromptSubmit` reads `prompt` and returns one `additionalContext` line, "This reads as a direction question: `picket:consulting` handles it, not a lane", when the prompt matches one of the draft's eight phrasings case-insensitively at word boundaries: "should we", "which approach", "build or buy", "trade-off between", "stress-test", "question me", "interview me", "challenge my thinking". It stays silent when `source` is present and is not `user`, when the prompt has three words or fewer, when it starts with a reject reply (`x ` or `reject:`), and when it contains `picket:`. The decision is one pure function of the prompt and the source, exported for the unit test. The contract was read from the Claude Code 2.1.314 binary: the input carries `prompt` and an optional `source`, and the output takes `hookSpecificOutput.hookEventName: "UserPromptSubmit"` with `additionalContext`.
**Instead of:** importing the gate reply grammar from `src/lib/verbs/reply/table.mts`: the layer rule lets a hook import only a verb's index, and the three-word rule already covers every reply but `x <why>`, so the hook keeps one small reject pattern of its own. That is a second copy of the reject shape; a new long reply form must be added there too.
**Risks:**
- **RISK-002** The hook runs on every prompt, and a broad match adds noise. Mitigation: the phrase list is closed and pinned both ways by the test; a false match is fixed in the list, never by widening it (draft risk 2).

### D-003: One flag, `[STRATEGIC REVIEW NEEDED]`, on the line that carries the id
**Decision:** The analyst flags a finding and the architect flags a decision or an open question with `[STRATEGIC REVIEW NEEDED]` on the same line as the id: the `- **R-###**` finding line (after its one confidence marker, as `[ARCHITECT REVIEW NEEDED]` sits today), the `### D-###` heading, or the `- **OQ-###**` line. The flag replaces the design template's and the architect shell's `[STRATEGIC]`. `reportFindings` gains `strategic_review: string[]`; `artifact.mts` gains a scan that returns the flagged `D-###` and `OQ-###` ids of an order or design body. `Closing` gains `strategic: string[]`, and `closingBlock` appends `strategic review: <ids>` to the lane line (the research `Report:` line, or the order and design `Phases:` line) only when the list is not empty, so every close without the flag prints what it prints today. The lane skills tell the lead to offer `picket:consulting` for those ids.
**Instead of:** scanning whole decision sections for the flag: that needs section parsing in close, and a flag quoted inside a decision's prose would count. A heading-line flag also leaves the decision body untouched, so `lint.schema` asks for no revision bump when the architect adds it.

### D-004: Ratified strategy is read by instruction, and the sixth check is the reviewer's
**Decision:** The architect's Entry batch adds, when `artifacts/strategy/` exists, the charters of the contexts the request touches and every SDR whose `**Status:**` is `Ratified`. The cross-check gains a sixth check: a decision that contradicts a ratified SDR is Major; a full pass reads every ratified SDR, a delta pass only those the amended decisions touch. Projects without the folder read nothing extra (draft D-6).
**Instead of:** `picket next` listing the ratified SDRs as a `strategy:` message line: the status is computable, but the charter choice is judgement, so the line would cover half the rule and add a send field, a shell sentence and a fixture for one SDR in this repo.

### D-005: `understanding` is removed whole; its steps move into `consulting`
**Decision:** `consulting` takes `steps/interview.md` (today's prepare and interview steps: the one-question protocol and the four termination conditions) and `steps/capture.md` (today's `30-capture.md` with the `.claude/MEMORY.md` structure unchanged, draft D-5), both passing every skill shape check outright: `# Consulting: <name>` headers, an ordered list outside fences, no repeated paragraph. `src/skills/understanding/` is deleted and every citer moves to `consulting` or drops the name. `discuss.md` points to `steps/capture.md` in place of its own capture paragraph, so the capture rule has one copy.
**Instead of:** keeping `understanding` as a thin alias that loads consulting's interview step: two routable skills on one conversation keep two descriptions competing in the routing test and two capture homes (draft D-1).

## Scope

**In:**
- The consulting merge, its citers, docs and tests; CLAUDE.md rule 1 and its template.
- The brief flags, the `## Brief` section, the analyst and architect sends and Entry lines, the report template's Context line, the lane open steps.
- `inject.consulting`, `UserPromptSubmit` in the hook list and its tests.
- Strategy reading in the architect's Entry, the sixth cross-check check, the strategic flag in reports, records and close, and the consulting offer at close.

**Out:**
- The glossary entry shape and the `.claude/MEMORY.md` cut (D3, the next item); the move of development's private memory.
- A `lint.schema` check for "Scope as understood" or for the flag's position.
- Bench runs; the guard tasks are named as a risk for the user to run after close.

## Phase 1: One consulting skill
**Touch set:**
- `src/skills/consulting/SKILL.md`: two modes, four steps, capture rule
- `src/skills/consulting/steps/discuss.md`: capture paragraph points to capture.md
- `src/skills/consulting/steps/interview.md`: new, prepare plus interview
- `src/skills/consulting/steps/capture.md`: new, from 30-capture.md
- `src/skills/understanding/SKILL.md`: deleted
- `src/skills/understanding/steps/10-prepare.md`: deleted
- `src/skills/understanding/steps/20-interview.md`: deleted
- `src/skills/understanding/steps/30-capture.md`: deleted
- `src/.claude-plugin/plugin.json`: drop the understanding entry
- `src/skills/documenting/SKILL.md`: glossary row names consulting only
- `src/skills/explaining/steps/gather.md`: line 9 drops the name
- `docs/how-to.md`: line 213 names `/picket:consulting`
- `docs/reference/skills.md`: rows 13 and 14, sections 74 to 88
- `test/repo/skills.test.mjs`: shrink UNCONVERTED_SKILLS and PENDING
- `test/repo/description-cases.json`: drop understanding, re-own its cases
- `src/templates/claude-block.md`: rule 1 sentence
- `CLAUDE.md`: rule 1 sentence, same text

**Changes:**
- `consulting/SKILL.md` per draft 17 "One `consulting`, two modes": `## Steps` is the draft's four items (discuss, interview, capture, ratify); `when_to_use` adds "question me on this", "stress-test this plan", "interview me", "challenge my thinking", "sharpen the terminology"; `## Rules` replaces the `picket:understanding` pointer with the capture rule: a project decision goes to `.claude/MEMORY.md` or an SDR, a code convention to a project rule under `.claude/rules/`, and auto-memory holds only how to work with the user. The listing stays within 1,536 characters.
- `interview.md` carries the prepare reading, the design-tree walk, the one-question protocol and the four termination conditions as an ordered list; `capture.md` carries the MEMORY.md structure fence unchanged, its rules as an ordered list, and the closing summary.
- `skills.test.mjs`: `UNCONVERTED_SKILLS` is `["benchmarking", "branching"]`; every `understanding` path leaves `PENDING`; `claims` keeps only `src/skills/branching/SKILL.md`.
- `description-cases.json`: the `understanding` entry goes; consulting gains at least one interview positive; the negatives owned by `understanding` move to `consulting` or are replaced, keeping 3 positives and 2 negatives per skill.
- Rule 1 of `claude-block.md` and of `CLAUDE.md` ends with "A direction or strategy question (should we, which approach): `picket:consulting`."

**Done when:**
- **T-1.1** `src/skills/understanding/` does not exist, and `git grep -n -e "picket:understanding" -e "skills/understanding" -e '"understanding"' -- src test docs CLAUDE.md ':!src/lib/util/yaml-lite-corpus.test.json'` finds nothing (that corpus is a frozen fixture of old records).
- **T-1.2** `consulting/SKILL.md` lists the four steps in the draft's order, names both new step files, and carries the five interview phrasings and the capture rule.
- **T-1.3** `node --test test/repo/skills.test.mjs` passes with `UNCONVERTED_SKILLS` of two names and no consulting path in any `PENDING` list.
- **T-1.4** `node --test test/repo/descriptions.test.mjs` passes: no case names `understanding`, the routing share is at least 0.95, and no description pair reaches cosine 0.75.
- **T-1.5** `capture.md` keeps the `# Project Understanding`, `## Language`, `## Flagged ambiguities` and `## Decisions` structure of today's `30-capture.md`.
- **T-1.6** `CLAUDE.md` starts with the text of `src/templates/claude-block.md`, both end rule 1 with the consulting sentence, and the CLAUDE.md budget test passes.
- **T-1.7** `npm test` passes.

## Phase 2: The brief
**Touch set:**
- `src/lib/shared/work/brief.mts`: new, Brief type, render, read
- `src/lib/shared/work/brief.test.mts`: new, round trip and absence
- `src/lib/verbs/open/index.mts`: three flags, append the section
- `src/lib/verbs/open/index.test.mts`: parse and write cases
- `src/lib/shared/work/snapshot.mts`: `brief` field from request.md
- `src/lib/shared/work/send.mts`: brief lines for analyst, architect
- `src/lib/shared/work/send.test.mts`: messages with and without brief
- `test/support/snapshot.mts`: `brief` input, default null
- `test/repo/agents.test.mjs`: ENTRY_FIXTURES carry a brief
- `src/agents/analyst.md`: Entry names the brief lines
- `src/agents/architect.md`: Entry names the brief lines
- `src/skills/documenting/templates/report.md`: Context opens with scope
- `src/skills/ordering/steps/open.md`: flags and when to ask
- `src/skills/designing/steps/open.md`: flags and when to ask
- `src/skills/researching/steps/outline.md`: flags and when to ask
- `docs/reference/cli.md`: regenerated open usage

**Changes:**
- `brief.mts` per D-001. `open` parses the flags with the usage string `[--purpose "<p>" --in-scope "<s>" --out-of-scope "<o>"]`; a partial set, an empty or multi-line value, or a brief with no request is a `UsageError`. `OpenInput` gains `brief: Brief | null`, and `request.md` is the request text, a blank line, then the section.
- `WorkSnapshot` gains `brief: Brief | null`, read by `readSnapshot`; `stateView` output does not change. The architect message is `work`, `lane`, `request`, the three brief lines, then `preflight` and `sources` when present; the analyst message is `work`, `request`, the three brief lines, then `pass: outline`.
- Analyst and architect `## Entry` name `` `purpose:` ``, `` `in scope:` `` and `` `out of scope:` `` as sent when the request carries a brief. The report template's `## Context` comment asks the outline to open with "Scope as understood: …".
- Each lane open step adds the three flags to its `picket open` line, filled from the request, and says in under 25 words: ask the user first only when the purpose is missing or the scope reads two ways, in one message with each field's default, then stop; the reply opens the item.
- Run `npm run docs` and stage `docs/reference/cli.md` before `npm test`.

**Done when:**
- **T-2.1** A unit test opens an item with the three flags and reads `request.md`: the request text, then `## Brief` with the three lines in order; a second test reads the brief back through `readSnapshot`.
- **T-2.2** `open` throws `UsageError` on two of the three flags, on an empty value, and on a brief with no request; with no flags the saved `request.md` is byte-identical to today's.
- **T-2.3** `sendsFor` gives the analyst `work`, `request`, `purpose`, `in scope`, `out of scope`, `pass: outline` in that order when the snapshot has a brief, and today's exact message when it has none; the architect likewise, with the brief lines before `preflight`.
- **T-2.4** `node --test test/repo/agents.test.mjs` passes with fixtures that carry a brief, so both Entry sections name the three keys.
- **T-2.5** Driven against a scratch project outside the repo: the built `picket open --lane order` with the three flags (and `--user-lane` if admit asks for it), then `picket next <id>`, prints a send whose message holds `purpose: `, `in scope: ` and `out of scope: ` lines; the block quotes the output.
- **T-2.6** `docs/reference/cli.md` in the git index shows the new flags, and `npm test` passes.

## Phase 3: The prompt hook and the strategic flag
**Touch set:**
- `src/lib/hooks.mts`: UserPromptSubmit event, inject.consulting entry
- `src/lib/hooks/hook-spec.mts`: payload with prompt, source; context output
- `src/lib/hooks/inject/consulting/index.mts`: new hook handler
- `src/lib/hooks/inject/consulting/index.test.mts`: new, phrasings both ways
- `test/repo/hook-list.test.mjs`: EXPECTED_GROUPS gains the group
- `test/repo/plugin-layout.test.mjs`: nine events
- `docs/reference/hooks.md`: regenerated hook table
- `src/agents/architect.md`: strategy reads, flag replaces [STRATEGIC]
- `src/agents/analyst.md`: strategic flag on findings
- `src/skills/reviewing/checklists/crosscheck.md`: sixth check, Major severity
- `src/lib/shared/work/report.mts`: strategic_review ids
- `src/lib/shared/work/report.test.mts`: flagged and unflagged findings
- `src/lib/shared/work/artifact.mts`: flagged D and OQ ids
- `src/lib/shared/work/artifact.test.mts`: heading and OQ line cases
- `src/lib/verbs/close/close.mts`: Closing.strategic
- `src/lib/verbs/close/block.mts`: strategic review part
- `src/lib/verbs/close/index.test.mts`: block with and without ids
- `src/skills/researching/SKILL.md`: flag rule, consulting offer
- `src/skills/ordering/SKILL.md`: consulting offer at close
- `src/skills/designing/SKILL.md`: consulting offer at close
- `src/skills/documenting/templates/report.md`: Recommendations comment names flag
- `src/skills/documenting/templates/design.md`: OQ comment names flag

**Changes:**
- `HOOK_EVENTS` gains `UserPromptSubmit`; `Payloads` gains it as `CommonPayload & { prompt?: string; source?: string }`; `OutputFor` maps it to `ContextOutput`. The `inject.consulting` entry sits right after `inject.extensions` in `HOOKS`, so the built `hooks.json` lists its group third. The handler is D-002's pure function behind `HookSpec<"UserPromptSubmit">` with `onBadInput: "empty"`.
- Architect `## Entry` adds D-004's strategy reads; `## Constraints` states D-003's flag for decisions and open questions, and the `[STRATEGIC]` sentence under Design goes. Analyst `## Constraints` adds the flag for a finding that needs a strategic call. The cross-check heading becomes `## Six checks, in order`, its scope sentences say six, check 6 and the Major severity line state D-004.
- `report.mts`, `artifact.mts`, `close.mts` and `block.mts` per D-003. The researching Rules and Output, and one short close sentence in the ordering and designing skills, say to offer `picket:consulting` for the `strategic review:` ids.
- Run `npm run docs` and stage `docs/reference/hooks.md` before `npm test`.

**Done when:**
- **T-3.1** The unit test returns the context line for each of the eight phrasings and null for: `a`, `r 2`, `x should we drop it`, `reject: which approach failed`, a prompt naming `picket:ordering`, `should we?` (three words or fewer), a `source` of `sdk`, and a prompt with none of the phrases.
- **T-3.2** `node --test test/repo/hook-list.test.mjs test/repo/plugin-layout.test.mjs` passes with the `["UserPromptSubmit", undefined, ["inject.consulting"]]` group third and nine registered events.
- **T-3.3** Driven: piping `{"hook_event_name":"UserPromptSubmit","prompt":"should we build or buy the billing engine"}` into the built `inject.consulting.mjs` prints JSON whose `hookSpecificOutput.additionalContext` is the suggestion line, and piping `{"hook_event_name":"UserPromptSubmit","prompt":"a"}` prints nothing; the block quotes both.
- **T-3.4** `test/timing/budgets.test.mjs` passes, so `inject.consulting.mjs` starts within 200 ms cold.
- **T-3.5** `reportFindings` returns `strategic_review: ["R-002"]` for a body whose R-002 line carries the flag; the artifact scan returns `["D-002", "OQ-001"]` for a body flagging that heading and that OQ line, and nothing for a flag inside a decision paragraph.
- **T-3.6** `closingBlock` appends ` · strategic review: R-002` to a research `Report:` line and ` · strategic review: D-002` to a design `Phases:` line, and every existing close test passes unchanged.
- **T-3.7** No file under `src/` contains `[STRATEGIC]` alone, the cross-check names six checks, and the architect Entry names `artifacts/strategy/` and `Ratified`.
- **T-3.8** `npm test` passes.

## Open questions

none

## Revision log
