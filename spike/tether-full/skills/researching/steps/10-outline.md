# Researching, step 1: the outline turn

```
node "${CLAUDE_PLUGIN_ROOT}/bin/harness.mjs" new --lane research --title "<six-word title>"
```

Spawn the analyst once, named `analyst`:

```
work: <id>
question: <the user's question, verbatim>
sources: <paths, URLs, ticket keys named in the request, or "discover from the question">
step: .claude/skills/researching/steps/10-outline.md (analyst section below)
```

Wait for `REPORT WRITTEN`, render the packet from `SKILL.md`, stop.

## Analyst section

One turn, bounded: read at most 12 files (the ones the question names, then entry points and the modules they import), every named URL, and every named ticket. Do not read a whole directory in this pass.

Write `work/<id>/research.md` from `.claude/skills/documenting/templates/report.md` with:

1. The frontmatter filled (`kind: report`, `title`, `date`, `audience`, `sources` as the list you actually read, `confidence`).
2. `## Summary`: the answer as far as you can give it now, three to five sentences, each claim with its confidence marker.
3. Every other required heading present with one line each: what the section will say, or `pending deep pass`.
4. `## Findings`: the findings you can already state as `R-###` lines with marker and location.
5. `## Sources for the deep pass`: the files, directories, URLs and tickets you would read next, with one reason each; this is what the user redirects.

End with the analyst output block and `REPORT WRITTEN`.
