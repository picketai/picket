# Designing, step 1: open the work item and get the record written

```
node .claude/bin/harness.mjs new --lane design --title "<six-word title>" --text "<the request, verbatim>"
node .claude/bin/harness.mjs preflight <id> --human
```

The kernel saves the request as `work/<id>/request.md`, which the cumulative review traces against. A request with quotes or newlines goes in a scratchpad file passed as `--request <file>` instead; an item escalated from ordering passes the same request again.

A request that names a Jira key (`RENT-123`): fetch it with `getJiraIssue` (`view: full`), write its description and acceptance-criteria fields unedited, in that order, to a file in the session scratchpad, and add `--ticket <KEY> --story <file>` to `harness new`. Never summarise or reword the story: the reviewer quotes it. Exit 2 means a pinned reference (`analysis@<branch>:<path>`) matched nothing; print the places it lists and ask. Remote-only branches are not searched.

When `harness next <id>` says `resolve_sources`, this is the opening gate: print `harness packet <id>` verbatim and stop. Apply each reply with `harness source pick <id> <ref> <label>`, then spawn the architect, adding `sources: work/<id>/sources.yaml` to its message when that file exists.

Preflight `fail` lines stop you; print them and ask. Spawn the architect once, named `architect`, with this message followed by the Architect section below pasted verbatim (it is in your context already; pasting it saves the architect a round trip):

```
work: <id>
lane: design
request: <the user's request, verbatim>
preflight: <warn lines, or none>
step: .claude/skills/designing/steps/10-design.md, architect section follows
```

Wait for `ARTIFACT WRITTEN`, then continue to `steps/20-crosscheck.md` in the same turn.

## Architect section

Read `.claude/skills/documenting/templates/design.md`, `.claude/PROJECT-MAP.md` when present, the source files the request names, and `work/*/design.md` of any other open item that touches the same modules (decisions there bind you).

Write `work/<id>/design.md` in two saves, because the developer starts on the first:

1. First save: frontmatter (`lane: design`, `phases:` with the phase 1 entry at least), `## Problem` (the forces and binding constraints, 2 to 5 sentences), `## Decisions` complete, `## Scope`, and `## Phase 1` complete with touch set, changes, and 3 to 8 criteria. Nothing else yet.
2. Second save: the remaining phases (up to 10, each independently shippable), `## Open questions`, an empty `## Revision log`, and the full `phases:` frontmatter with `files`, `greps`, `tests`, `drive`, `security` per phase.

Decisions: at most eight `### D-###`. Each names the choice, the constraint it satisfies, `**Instead of:**` the strongest alternative with the reason it lost, `**Risks:**` as `RISK-###` with a mitigation. Mark `[IRREVERSIBLE]` inline where a step cannot be undone (a migration that drops data, a published contract, a deleted branch). Use tactical DDD vocabulary where the design touches domain logic or persistence; say "infrastructural decision" where it does not.

Verify every premise about existing schema, data, legacy behaviour or a third-party contract by reading the source or the live schema before a phase rests on it; otherwise record it as `OQ-###` with a fallback and keep the dependent criterion out of phase 1. A strategic question the design cannot settle (a boundary move, a build-or-buy choice) is an `OQ-###` flagged `[STRATEGIC]`; the lead takes it to `consulting`.

End with the architect output block and `ARTIFACT WRITTEN` after the second save.
