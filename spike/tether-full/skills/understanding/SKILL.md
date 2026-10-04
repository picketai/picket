---
name: understanding
description: Structured questioning session that stress-tests a plan, design, or feature description against the project's existing language and code, sharpens fuzzy terminology, and captures every resolved term or decision inline to `.claude/MEMORY.md`. Use when the user says "question me on this", "stress-test this plan", "challenge my thinking", "help me think this through", "interview me", or "sharpen the terminology", or wants shared understanding built before implementation. Invoke via `/understanding <plan, design, or idea>`. Not preloaded into any agent; the consultant, analyst, and architect read it on demand.
user-invocable: true
---

# Skill: understanding

Walk the design tree of the user's plan one branch at a time. Resolve ambiguous terms against the project's existing language, check claims against the code, and write every resolved term or decision into `.claude/MEMORY.md` the moment it settles.

## User input

```text
$ARGUMENTS
```

The plan, design, or idea to stress-test. Empty input: ask "What should we work through? Provide the plan, design, or idea you want stress-tested." and stop.

## Steps

Read one step file at a time, in order.

| Step | File | Read it when |
|---|---|---|
| 1 | `steps/01-prepare.md` | Starting a session: load the glossary and skim the code for prior art. An agent that has already validated its input joins here. |
| 2 | `steps/02-interview.md` | Asking questions. Carries the questioning protocol and the four termination conditions. |
| 3 | `steps/03-capture.md` | A term or decision has resolved and must be written to `.claude/MEMORY.md`; also at close, for the summary. |

## Rules that hold throughout

Ask one question at a time and wait for the answer. Give your recommended answer with every question.

Never write implementation detail, code, or specs into `.claude/MEMORY.md`. Never create the file eagerly; it is created on the first resolved entry. Never batch updates. Never overwrite an existing entry without surfacing the conflict first.

## Bundled resources

```
.claude/skills/understanding/
  SKILL.md
  steps/01-prepare.md
  steps/02-interview.md
  steps/03-capture.md
```
