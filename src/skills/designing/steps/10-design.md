# Designing, step 1: open the work item and get the record written

```
picket open --lane design --title "<six-word title>" --text "<the request, verbatim>"
picket preflight <id> --human
```

The kernel saves the request as `work/<id>/request.md`, which the cumulative review traces against. A request with quotes or newlines goes on stdin through a quoted heredoc with `--request -` instead; an item escalated from ordering passes the same request again.

A request that names a Jira key (`SHOP-123`): follow `../shared/procedures/jira-intake.md` before `picket open`.

When `picket next <id>` says `resolve_sources`, this is the opening gate: print `picket packet <id>` verbatim and stop. Apply each reply with `picket source pick <id> <ref> <label>`, then spawn the architect, adding `sources: work/<id>/sources.yaml` to its message when that file exists.

Preflight `fail` lines stop you; print them and ask. Spawn the architect once (type `picket:architect`), named `architect`, with this message followed by the Architect section below pasted verbatim (it is in your context already; pasting it saves the architect a round trip):

```
work: <id>
lane: design
request: <the user's request, verbatim>
preflight: <warn lines, or none>
step: designing/steps/10-design.md, architect section follows
```

Wait for `ARTIFACT WRITTEN`, then continue to `steps/20-crosscheck.md` in the same turn.

## Architect section

Read `documenting/templates/design.md`, `.claude/PROJECT-MAP.md` when present, the source files the request names, and `work/*/design.md` of any other open item that touches the same modules (decisions there bind you).

Write `work/<id>/design.md` in two saves, because the developer starts on the first:

1. First save: frontmatter (`lane: design`, `phases:` with the phase 1 entry at least), `## Problem` (the forces and binding constraints, 2 to 5 sentences), `## Decisions` complete, `## Scope`, and `## Phase 1` complete with touch set, changes, and criteria. Nothing else yet.
2. Second save: the remaining phases (each independently shippable), `## Open questions`, an empty `## Revision log`, and the full `phases:` frontmatter with `files`, `greps`, `tests`, `drive`, `security` per phase.

Phases, decisions and criteria stay within the design lane's caps in the `work-items` rule. Decisions are `### D-###`; each names the choice, the constraint it satisfies, `**Instead of:**` the strongest alternative with the reason it lost, `**Risks:**` as `RISK-###` with a mitigation. Mark [IRREVERSIBLE] inline where a step cannot be undone (a migration that drops data, a published contract, a deleted branch). Use tactical DDD vocabulary where the design touches domain logic or persistence; say "infrastructural decision" where it does not.

A schema or data migration reads `designing/steps/15-migration.md` before writing its phases.

Verify every premise about existing schema, data, legacy behaviour or a third-party contract by reading the source or the live schema before a phase rests on it; otherwise record it as `OQ-###` with a fallback and keep the dependent criterion out of phase 1. A strategic question the design cannot settle (a boundary move, a build-or-buy choice) is an `OQ-###` flagged `[STRATEGIC]`; the lead takes it to `picket:consulting`.

End with the architect output block and `ARTIFACT WRITTEN` after the second save.
