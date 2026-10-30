# 19: The glossary entry shape and the injection cut

Status: approved (2026-10-30).

Step 5, third standalone item, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: D3 as re-approved on 2026-10-28. Consulting's capture step owns the one short entry shape; the long glossary template lives under `artifacts/strategy/glossary/`; `inject.state` cuts `.claude/MEMORY.md` at a whole entry; a check on writes warns when the file passes 6,000 characters; today's file is trimmed and gains the five terms approved on 2026-10-30.

## Today

| Fact | Value |
|---|---|
| `.claude/MEMORY.md` | 6,744 characters, 12 terms, 13 decisions; one decision is marked superseded (Tether) |
| Injection | `inject.state` slices the file at `GLOSSARY_CHARS = 6000` mid-entry, with no note that it was cut; today the last 743 characters (the hooks, plugin root and local install decisions) never reach the session |
| Short shape | `consulting/steps/capture.md` shows `**Term**:`, a one or two sentence definition, `_Avoid_:`; no pointer line, no rule for where a longer entry goes |
| Long shape | `documenting/templates/glossary.md` (40 line cap, `INDEX.md`) says its location is "this work item's directory, or artifacts/<kind>/<term-slug>.md"; the registry row and `picket name glossary` already say `artifacts/strategy/glossary/<slug>.md` |
| Readers | consulting (`discuss.md`, `interview.md`), the analyst and the architect at Entry, the reviewer's cross-check row 1, proofreading's consistency pass |
| Write check | none; nothing tells the writer the file outgrew the cut |

## Target

### The short entry shape

`capture.md` owns it:

```md
**{Term}**:
{One or two sentences on what it IS.}
Pointer: {one path or command, no explanation}   (optional)
_Avoid_: {alias}, {alias}
```

A term that needs more (distinguished from, anti-examples, per-context meanings) gets a long entry at `artifacts/strategy/glossary/<term-slug>.md` from `documenting/templates/glossary.md`, with one line in `INDEX.md`; its short entry keeps the definition and a `Pointer:` to the file. MEMORY.md gains one line under `## Language` pointing to `artifacts/strategy/glossary/INDEX.md` once that index exists. Consulting reads both. `ratify.md`'s glossary row and the template's location comment say the same path.

### The cut

`inject.state` keeps whole entries: it cuts at the last entry boundary (a blank line before `**Term**:`, a `- **` decision line, or a `##` heading) at or under 6,000 characters, and appends `Cut at 6,000 characters; read .claude/MEMORY.md for the rest.` A file under the limit is injected whole, as today.

### The write check

A `PostToolUse` hook on `Write` and `Edit` of `.claude/MEMORY.md` adds context when the file is over 6,000 characters: its size, and "move the longest decision's detail to an SDR under `artifacts/strategy/decisions/` and leave a pointer". It never blocks.

### Today's file

The lead edits `.claude/MEMORY.md` directly (agents never edit `.claude/`), after the user approves the text, in the same item's last phase or as its own commit: the superseded Tether decision goes, the five SDR 00001 decisions become one, the Picket name, packaging, extensions and local install decisions lose their history, and the five approved terms (send, gate reply, instance tag, shell, Entry) are added. Result: 5,638 characters, 17 terms, 8 decisions. The proposed file is shown to the user before it lands.

## Decisions

- **D-1 One short shape, owned by capture.** Three files describe a glossary entry today and disagree; the entry other files cite lives where it is written.
- **D-2 Long entries are files, not MEMORY.md paragraphs.** The file is injected into every session; development's 25 long entries show the need is real, and a file per term keeps it out of the per-turn cost.
- **D-3 Cut at a whole entry and say so.** A half entry reads as the whole truth; the note sends the reader to the file.
- **D-4 Warn, never block.** A capture mid-discussion must not fail; the warning names the fix (an SDR), which is what capture's rule 3 already asks.
- **D-5 The trim is the user's text.** MEMORY.md holds the user's decisions; the lead proposes, the user approves.

## Migration

1. `capture.md` gains the `Pointer:` line and the long-entry rule; `ratify.md` and `templates/glossary.md` name `artifacts/strategy/glossary/`.
2. `inject.state` cuts at a whole entry with the note; tests for under, at and over the limit and for each boundary kind.
3. The `PostToolUse` write check; a test under and over the limit; the hook budget holds.
4. The trimmed MEMORY.md, after the user's approval, committed by the lead.

## Risks

- A boundary the cut misses (an entry with an internal blank line) cuts earlier than it could; it never cuts mid-line, and the note is always there.
- The write check adds a hook on every `Write` and `Edit`; it returns at once for any other path, inside the 200 ms cold budget.

## Affects

`src/skills/consulting/steps/{capture,ratify}.md`, `src/skills/documenting/templates/glossary.md`, `src/lib/hooks/inject/state/`, a new hook under `src/lib/hooks/lint/` or `src/lib/hooks/observe/`, `src/lib/hooks.mts`, `docs/reference/`, `.claude/MEMORY.md` (lead only).

## Open questions

None.
