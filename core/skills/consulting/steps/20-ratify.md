# Consulting, step 2: ratify

Only on the user's word ("ratify", "write it up", "make it an SDR"). Pick the artifact by what was decided:

| Decided | Template | Path |
|---|---|---|
| a subdomain's investment posture, a build-or-buy, a relationship pattern | `documenting/templates/sdr.md` | `artifacts/strategy/decisions/NNNNN-<slug>.md` |
| a bounded context's purpose, language, ownership | `documenting/templates/charter.md` | `artifacts/strategy/<context>-charter.md` |
| how contexts relate | `documenting/templates/context-map.md` | `artifacts/strategy/<scope>-context-map.md` |
| a term | `documenting/templates/glossary.md` | `.claude/MEMORY.md` glossary section |

Derive the filename with `node "${CLAUDE_PLUGIN_ROOT}/skills/documenting/scripts/filename.mjs" --kind <sdr|charter|context-map> "<subject>"`. Read the template, fill every required section from the discussion (no new reasoning at this step; a gap in the discussion is a gap to go back and close), strip every placeholder, write the file.

An SDR that leaves tactical work behind adds one line per item under `## Tactical follow-up` flagged `[TACTICAL DESIGN NEEDED]`; the lead offers `tether:designing` for each.

Reply with the path, the binding constraints the record names, and the `[IRREVERSIBLE]` items, three lines at most.
