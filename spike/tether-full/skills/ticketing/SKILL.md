---
name: ticketing
description: >
  Pull, draft, create and update work items on a ticketing platform through its MCP server
  (Jira today): user story, change request, bug, technical debt, spike, epic, each from a
  template under templates/<provider>/. Use when the user says "write a ticket", "log a bug",
  "make a Jira item", "pull JIRA-123", "update that story", "draft an epic", or mentions Jira,
  tickets, backlog items, issues or sprint work. Pulls are autonomous; every create, edit,
  transition or comment is shown for confirmation first. `/ticketing [--pull|--create|--update]
  [--story|--change|--bug|--debt|--spike|--epic] <text or key>`.
user-invocable: true
---

# Ticketing

Input: `$ARGUMENTS`. Empty: list the item types below and ask what to draft, pull or update; stop.

## Routing

Provider: Jira unless another is named. A provider needs a row here, a server in `.mcp.json` (its name is the tool namespace: server `atlassian` gives `mcp__atlassian__*`), a `templates/<provider>/` directory, and its tools granted on the agent that runs the skill (a skill cannot widen an agent's tools).

| Provider | Status | Templates | Namespace |
|---|---|---|---|
| Jira | active | `templates/jira/` | `mcp__atlassian__*` |
| Linear, Asana, Notion | future: say so, offer to draft in the Jira structure | none | none |

Item type: first flag wins; without one, infer ("crash", "null ref" → bug; "refactor", "cleanup" → debt; "investigate", "decide between" → spike; "spans sprints", "umbrella" → epic); still ambiguous → show the table and ask.

| Flag | Item | Template | Jira type | Voice |
|---|---|---|---|---|
| `--story` | user story | `user-story.md` | Story | product manager |
| `--change` | change request | `change-request.md` | Story | business analyst |
| `--bug` | bug | `bug.md` | Bug | QA engineer |
| `--debt` | technical debt | `tech-debt.md` | Task | principal engineer |
| `--spike` | spike | `spike.md` | Task | tech lead |
| `--epic` | epic | `epic.md` | Epic | programme lead |

Operation: none → draft (reply only, no file); `--pull` → fetch and render; `--create` → draft then create; `--update` → change an existing item. Strip flags before reading the rest as text or key. The platform is the system of record.

## Steps

| Operation | Read |
|---|---|
| draft, create, update (the drafting part) | `steps/10-draft.md` |
| pull, create, update (the platform calls) | `steps/20-jira.md` |

## Rules

Output is pure Markdown in the template's exact section order: no preamble, no trailing commentary. Summary at most 255 characters in the template's naming convention. Acceptance criteria are checkboxes in Given/When/Then or precise testable assertions; "works correctly" is forbidden. Definition of Done has at least four items. Priority is one of Critical, High, Medium, Low with a one-sentence reason. Missing input becomes `> REQUIRES INPUT: <what, from whom>`; nothing is fabricated. Every item opens with `> Input provided by: <role>: <one sentence on what they handed over>`.

Self-check before presenting: summary length and convention; description a non-engineer can follow; each criterion independently testable; Out of Scope present and non-empty; Definition of Done with 4 or more items; Priority with reason; `REQUIRES INPUT` wherever input was thin.

## Layout

```
.claude/skills/ticketing/
  SKILL.md, steps/10-draft.md, steps/20-jira.md
  templates/jira/<item>.md    mandatory structure per item (read before drafting)
  examples/jira/<item>.md     one worked sample per item (read only when tone is unclear)
```
