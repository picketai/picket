---
name: documenting
description: >
  Template registry for every structured document Picket writes: work orders, design
  records, analysis reports, bounded-context charters, context maps, strategic decision
  records, glossary entries and REST API references. Carries the filename rule, the audience
  rule, the confidence markers and the Word export. Use when the user says "write a report",
  "document this", "draft the order", "write a charter", "map the contexts", "add a glossary
  entry", "document the API", or when an agent must produce one of these from a discussion.
  Auto-loaded on the analyst and architect; `/picket:documenting <kind> <subject>` standalone.
user-invocable: true
---

# Documenting

Read the template for the kind before writing. Templates carry structure and constraints only; the rules below are shared by all kinds.

## Registry

| Kind | Template | Written by | Lives at |
|---|---|---|---|
| order | `templates/order.md` | architect | `work/<id>/order.md` |
| design | `templates/design.md` | architect | `work/<id>/design.md` |
| report | `templates/report.md` | analyst | `work/<id>/research.md`, or `artifacts/reports/<slug>.md` standalone |
| charter | `templates/charter.md` | consulting | `artifacts/strategy/<context>-charter.md` |
| context-map | `templates/context-map.md` | consulting | `artifacts/strategy/<scope>-context-map.md` |
| sdr | `templates/sdr.md` | consulting | `artifacts/strategy/decisions/NNNNN-<slug>.md` |
| glossary | `templates/glossary.md` | consulting, understanding | `.claude/MEMORY.md` |
| api | `templates/api.md` | analyst | `artifacts/api/<slug>.md` |

## Shared rules

Filenames come from `node "${CLAUDE_PLUGIN_ROOT}/skills/documenting/scripts/filename.mjs" --kind <kind> "<subject>"` (add `--work <id>` for order and design); never derive one by hand. The script lowercases, drops stopwords, hyphenates, truncates to five tokens, and prefixes a zero-padded sequence where the kind numbers its files; a name that would start with report, summary, findings or analysis gets an `about-` prefix, because Claude Code refuses such a basename from a subagent.

Every template starts with a YAML frontmatter block (`kind`, `title`, `date`, `audience`, `sources`, `confidence`; order and design add `lane` and `phases`). Sections are fixed headings in fixed order. `<!-- required -->` marks the ones that must be filled; `<!-- optional: trigger -->` names when an optional one appears. Placeholders are `[REPLACE: ...]`. Strip every placeholder and every HTML comment before writing.

Audience: reports detect it from the request ("stakeholder", "executive" → stakeholder, no implementation detail; "developer", "codebase" → developer; otherwise collaborator). Orders and designs are always for developers; strategy documents for strategic stakeholders; API references for external integrators with no source access.

Confidence markers, first match wins: `[VERIFIED]` for a fact read directly from the source; `[INFERRED]` for what follows from verified facts by explicit steps; `[ASSUMED]` for what the source does not ground. A mixed finding takes the weakest marker or is split. Orders and designs carry no markers.

Typed IDs: findings `R-###`, decisions `D-###`, risks `RISK-###`, criteria `T-<phase>.<seq>`, open questions `OQ-###`. Encounter order, never renumbered, withdrawn with `[withdrawn]`.

## Word export

Only `node "${CLAUDE_PLUGIN_ROOT}/skills/documenting/scripts/export.mjs" --input <file>.md --output <file>.docx`. It applies the bundled reference styling and flattens it into direct formatting so Word, LibreOffice and Google Docs render the same document, and embeds the code font. Never call pandoc directly; a non-zero exit is reported, never worked around. Trigger: the user passes `--export [path]`.

## Standalone

`/picket:documenting <kind> <subject> [--export]`: derive the filename, read the template, write the document, run the export when asked, reply with the path in one line.
