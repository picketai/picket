# Consulting: ratify

Only on the user's word ("ratify", "write it up", "make it an SDR"). Pick the artifact by what was decided:

| Decided | Template | Path |
|---|---|---|
| a subdomain's investment posture, a build-or-buy, a relationship pattern | `../documenting/templates/sdr.md` | `picket name sdr "<subject>"` |
| a bounded context's purpose, language, ownership | `../documenting/templates/charter.md` | `picket name charter "<context>"` |
| how contexts relate | `../documenting/templates/context-map.md` | `picket name context-map "<scope>"` |
| a term | `../documenting/templates/glossary.md` | `picket name glossary "<term>"` (under `artifacts/strategy/glossary/`), with the short entry in `.claude/MEMORY.md` pointing to the file; or that glossary section alone for a short entry |

1. Run the path column's `picket name <kind> "<subject>"` for the path; an `exists` line under it means update that file.
2. Read the template.
3. Fill every required section from the discussion (no new reasoning at this step; a gap in the discussion is a gap to go back and close), strip every placeholder, and write the file.
4. An SDR that leaves tactical work behind adds one line per item under `## Tactical follow-up` flagged `[TACTICAL DESIGN NEEDED]`; the lead offers `picket:designing` for each.
5. Reply with the path, the binding constraints the record names, and the `[IRREVERSIBLE]` items, three lines at most.
