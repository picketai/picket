# 15: Documenting and consulting

Status: approved (2026-10-29).

Step 4, third group, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: `picket:documenting` and `picket:consulting` in bundle 2's shape, with D1 (the frontmatter and marker lines, `lint.schema` over reports with D10's caps), D6 (`picket name` and the research publish) and bundle 6.3 (the API reference keeps no frontmatter). The merge of `understanding` into `consulting` and the glossary shape are D4 and D3, standalone items in step 5; this group leaves `understanding` as it is.

## Today

| Fact | Value |
|---|---|
| `documenting/SKILL.md` | 4,038 bytes, preloaded by the analyst and architect; sections `Registry`, `Shared rules`, `Word export`, `Standalone`; `user-invocable: true` |
| D1 | line 35 says every template carries `confidence` (orders and designs do not, the API reference has no frontmatter); line 39 says orders and designs carry no markers, though touch set paths use `[INFERRED]` |
| `lint.schema` | checks orders and designs only; 3 past reports lack `confidence`, 1 improvises markers, 2 run past 50 findings |
| Filenames | `scripts/filename.mjs`, run through `node "${CLAUDE_PLUGIN_ROOT}/..."`; `CLAUDE_PLUGIN_ROOT` is empty in Bash, and no run since the plugin layout used it; registry "Lives at" disagrees with development's folders |
| Research report | the analyst may write `artifacts/reports/` standalone; the `about-` prefix exists for Claude Code's subagent Write refusal of `REPORT*.md` names |
| `consulting` | 2,110 bytes plus two `NN-` steps; `## Steps` is a table |

## Target

### `documenting`

- Frontmatter `description`, `when_to_use`, `argument-hint: "<kind> <subject> [--export]"`, no `user-invocable`. Body: purpose paragraph, `## Steps` (standalone use: name, read the template, write, export on `--export`, reply with the path), `## Rules` (registry, frontmatter, audience, markers, typed IDs, export), `## Output`.
- D1: the frontmatter line lists the truth: `kind`, `title`, `date`, `audience`, `sources`; reports and strategy documents add `confidence`; orders and designs add `lane` and `phases`; the API reference has none, by design (external readers, Word export). The marker line: "Orders and designs carry no markers in their prose; a touch set path the architect is unsure of is marked `[INFERRED]`."
- D6: `picket name <kind> "<subject>" [--work <id>]` prints the full path, one folder per kind, no kind suffix (`artifacts/strategy/charters/`, `context-maps/`, `glossary/`, `decisions/NNNNN-<slug>.md`, `artifacts/reports/`, `artifacts/api/`), and a second line `exists` when the file is there. `filename.mjs` and its test move to `src/lib/verbs/name/`; the `about-` prefix and the `-analysis` suffix go; the registry's "Lives at" column matches `picket name`, with a test comparing the two.

### Research publish (D6.2)

The analyst writes only inside `work/<id>/` and `.claude/PROJECT-MAP.md`. The research accept gate gains `[p] accept and publish to <picket name path>`; `picket reply <id> p` routes with `--publish`, and `picket route … --publish` copies `research.md` to that path. A repo test asserts that no fixed agent filename matches Claude Code's refused pattern.

### `lint.schema` over reports (D1)

`work/<id>/research.md` and `artifacts/reports/*.md` with `kind: report`: `confidence` in high, medium, low; each `- **R-###**` opens with exactly one marker after the id; no `[REPLACE:` and no HTML comment left; at most 50 findings, 120 words each, 3 top findings. Not checked: the weakest-marker rule, charters, SDRs, context maps, glossary entries, `artifacts/api/`.

### `consulting`

Bundle 2's shape only: frontmatter split, `## Steps` an ordered list naming `steps/discuss.md` and `steps/ratify.md`, step headers `# Consulting: <name>`, ordered lists inside. `ratify.md` and `sdr.md` cite `picket name`.

## Decisions

- **D-1 `understanding` waits for D4.** D4 merges it into `consulting` with an interview mode and a capture step shared with D3; reshaping it here would be rewritten there a week later.
- **D-2 `picket name` is a verb, not a fixed script path.** The script cannot be reached from Bash in the plugin layout, and a verb is on PATH for the lead and every agent.
- **D-3 Publishing is a kernel copy.** Claude Code refuses some subagent Writes by name; the kernel copy at the gate avoids the refusal and keeps the analyst's write scope to its work item.
- **D-4 Existing report names stay.** The `-analysis` suffix and `about-` prefix go for new names only; renaming committed reports breaks links for nothing.

## Migration

1. `picket name` verb, its test, the registry "Lives at" column and the comparison test; `filename.mjs` removed; citers moved.
2. `lint.schema` over reports with the caps.
3. Research publish: `[p]` at the research gate, `reply p`, `route --publish`, the analyst's write scope, the refused-name test.
4. `documenting` and `consulting` rewritten; their `PENDING` entries removed.

## Risks

- `lint.schema` over `artifacts/reports/` fails on the 3 reports without `confidence`. They are fixed in the same phase (add the field), not exempted.
- The research gate changes its options, which the bench's `research-11` task answers by letter. The bench answers `a` today, which still exists.

## Affects

`src/skills/documenting/` (SKILL.md, `scripts/filename.mjs` removed), `src/skills/consulting/`, `src/lib/verbs/{name,route,reply,packet}/`, `src/lib/shared/work/next-step.mts`, `src/lib/hooks/lint/schema` (or wherever `lint.schema` lives), `src/agents/analyst.md`, `src/skills/researching/SKILL.md`, `test/cli/filename.test.mjs` (moved), `test/repo/{skills,references}.test.mjs`, `artifacts/reports/` (three frontmatter fixes), `docs/reference/`.

## Open questions

None.
