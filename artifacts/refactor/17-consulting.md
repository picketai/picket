# 17: Consulting, the brief and the prompt hook

Status: approved (2026-10-30).

Step 5, first standalone item, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: D4 as approved on 2026-10-28. `understanding` merges into one lead-only `consulting` with two modes; a brief (purpose, in scope, out of scope) reaches the analyst and the architect; a `UserPromptSubmit` hook suggests consulting; strategy documents reach the architect. The glossary entry shape, the MEMORY.md cut and its size check are D3, the next item; the move of development's private memory is the last item of step 5.

## Today

| Fact | Value |
|---|---|
| `understanding` | 2,211 bytes plus `steps/10-prepare.md`, `20-interview.md`, `30-capture.md` (4,783 bytes); its description says the analyst and the architect read it on demand, and neither shell names it; never run in this repo or in development |
| `consulting` | 2,061 bytes plus `steps/discuss.md` and `steps/ratify.md`; `SKILL.md` says "`picket:understanding` carries the capture format"; 3 runs in this repo, none since 10 October |
| Citers of `understanding` | `plugin.json:24`, the documenting registry's glossary row, `explaining/steps/gather.md:9`, `docs/how-to.md:213`, `docs/reference/skills.md:14,82`, 2 prompts and 1 skill row in `description-cases.json`, `skills.test.mjs` (`UNCONVERTED_SKILLS`, three `PENDING` lists, `claims`) |
| Hooks | `HOOK_EVENTS` has no `UserPromptSubmit`; nothing suggests consulting when a direction question arrives |
| Messages | the analyst gets `work`, `request`, `pass: outline`; the architect gets `work`, `lane`, `request`, and `preflight`, `sources` when present; neither gets a purpose or a scope |
| Strategy | `artifacts/strategy/decisions/00001-...` is the only strategy document here; the architect reads `.claude/MEMORY.md` and `.claude/PROJECT-MAP.md`, never `artifacts/strategy/`; the cross-check walks an SDR only when the record cites it |
| CLAUDE.md | 2,142 of 2,560 bytes; rule 1 routes a change request and a plain question, nothing for a direction question |
| Research close | offers `picket:ordering` or `picket:designing` for `[ARCHITECT REVIEW NEEDED]` ids; never consulting |

## Target

### One `consulting`, two modes

`consulting` is lead only and has two modes, discuss (the default) and interview ("question me on this", "stress-test this plan", "interview me", "challenge my thinking", "sharpen the terminology"). Its `## Steps`:

1. A direction or strategy question: read `steps/discuss.md`.
2. A plan to stress-test: read `steps/interview.md` (today's prepare and interview steps, the one-question protocol and the four termination conditions).
3. A term or decision resolves in either mode: read `steps/capture.md` (today's `30-capture.md`, unchanged in shape; D3 reshapes the entry next).
4. The user says "ratify" or "write it up": read `steps/ratify.md`.

`when_to_use` gains the interview phrasings. `## Rules` gains the capture rule: a project decision goes to `.claude/MEMORY.md` or an SDR, a code convention to a project rule under `.claude/rules/`, and auto-memory holds only how to work with the user. `src/skills/understanding/` goes; every citer above moves to `consulting` or drops the name; `UNCONVERTED_SKILLS` shrinks to `benchmarking` and `branching`.

### The brief

Before the analyst (research lane) and before the architect (order and design lanes), the work item carries a brief of three lines: `purpose:` (what the answer or change is for), `in scope:`, `out of scope:`. `picket open` takes `--purpose`, `--in-scope`, `--out-of-scope` and writes them under a `## Brief` heading in `request.md`; `picket next` copies the three lines into the analyst's and the architect's message. The reviewer's `scope:` line keeps its meaning.

The lead fills the brief from the request. It asks the user only when the purpose is missing or the scope has two readings that lead to different work: one message, each field with its default, then stop; the reply opens the item. The analyst's outline opens `## Context` with "Scope as understood: …", so the user corrects a wrong scope at the outline gate.

### The prompt hook

`inject.consulting` on `UserPromptSubmit` adds one context line, "This reads as a direction question: `picket:consulting` handles it, not a lane", when the prompt matches a direction or stress-test phrasing ("should we", "which approach", "build or buy", "trade-off between", "stress-test", "question me", "interview me", "challenge my thinking"). It stays silent on a gate reply (`a`, `c`, `r 2`, `x <why>`, any prompt of three words or fewer) and on a prompt that already names a `picket:` skill. Unit tests pin the phrasings both ways; the hook keeps the 200 ms cold budget.

### Strategy reaches the architect

When `artifacts/strategy/` exists, the architect's Entry batch adds the charters of the contexts the request touches and every SDR whose status is `Ratified`. The cross-check gains a sixth check: a decision that contradicts a ratified SDR is Major. The analyst and the architect may flag `[STRATEGIC REVIEW NEEDED]` on a finding or a decision; `picket close --human` names those ids next to `[ARCHITECT REVIEW NEEDED]`, and the lead offers `picket:consulting` for them. The research close also offers consulting when the report carries that flag.

### CLAUDE.md

Rule 1 ends with "A direction or strategy question (should we, which approach): `picket:consulting`." About 90 bytes, inside the 2,560 budget.

## Decisions

- **D-1 One skill, two modes, lead only.** `understanding` lost its only caller when the consultant agent became a skill (`d8d4f90`); two skills on one conversation keep two capture formats, which is D3's defect.
- **D-2 The brief travels in the kernel's message.** `skills/shared/` is gone and the lead does not paste; `request.md` holds it once and `picket next` prints it, as it does every other field.
- **D-3 The lead asks only on a missing purpose or two readings.** Asking every time adds a stop to every bench task; the outline's "Scope as understood" catches the rest at a gate that already exists.
- **D-4 The hook suggests; it never routes.** A false match costs one ignored context line; routing on a regex would turn a false match into a wrong lane.
- **D-5 Capture moves unchanged.** D3 owns the entry shape; changing it here would be rewritten there.
- **D-6 Strategy is read only when the folder exists.** Projects without strategy documents pay nothing.

## Migration

1. `consulting` absorbs `understanding`: `steps/interview.md`, `steps/capture.md`, the citers, `plugin.json`, the description cases, the skills test, the docs; `understanding` removed.
2. The brief: `picket open` flags, the `## Brief` block, the analyst and architect sends, both shells' Entry, the report template's Context line, the lane open steps on when to ask.
3. `UserPromptSubmit` in `HOOK_EVENTS`, the build's `hooks.json`, `inject.consulting` with its tests.
4. Strategy: architect Entry, the cross-check's sixth check, `[STRATEGIC REVIEW NEEDED]` in the report and close code, the research close offer, CLAUDE.md rule 1.

## Risks

- The bench guards from D4: research 11 and 12, order 07 to 10, design 13 and 14 keep their stop counts. A brief question on a clear bench task is a defect in when the lead asks, fixed in the open steps.
- The prompt hook runs on every prompt. A slow or noisy match is fixed in the phrase list, never by widening it.
- The cross-check's sixth check can fire on an SDR nobody re-read since it was ratified. The row names the SDR, and the user decides at the drift gate.

## Affects

`src/skills/{consulting,understanding,explaining,documenting,researching,ordering,designing}/`, `src/.claude-plugin/plugin.json`, `src/agents/{analyst,architect}.md`, `src/skills/documenting/templates/report.md`, `src/skills/reviewing/checklists/crosscheck.md`, `src/lib/hooks.mts`, `src/lib/hooks/inject/consulting/` (new), `src/lib/hooks/hook-spec.mts`, `scripts/build.mjs`, `src/lib/verbs/{open,close}/`, `src/lib/shared/work/{send,report}.mts`, `src/templates/claude-block.md`, `CLAUDE.md`, `test/repo/{skills,descriptions}.test.mjs`, `test/repo/description-cases.json`, `docs/how-to.md`, `docs/reference/`.

## Open questions

None.
