# 14: The reviewing skill

Status: approved (2026-10-29).

Step 4, second group, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: `picket:reviewing` in bundle 2's shape, as the reviewer's small preloaded skill (bundle 3), with D2, D7 and the reviewer's half of D8 and bundle 4.3.

## Today

| Fact | Value |
|---|---|
| `reviewing/SKILL.md` | 11,227 bytes, preloaded into every reviewer spawn; sections `The review summary`, `Load table`, `Severities`, `Evidence bar`, `Finding format`, `Verdict rule`, `Pull request mode`, `Layout`; `user-invocable: true` |
| Load table | duplicated: the prose table at `SKILL.md:43-55` and `src/lib/shared/review-checklists.mts`, which since item 11 picks the files and puts them in `summary.json` |
| Checklists | 11 files, all `NN-` named; in the skills test's `names` `PENDING` |
| D2 rows | seven fail conditions accept a comment as the justification: TS T3, A1, E1; .NET N2; core Co1, Na2; clean architecture Uc2 |
| Pull request mode | 2,032 bytes reach every reviewer spawn for a lead-only procedure the user types |
| `pullrequest post --dry-run` | prints anchors as `path:line`, not the code at them |
| Reviewer memory | `literal-criterion-misses-go-to-amendment` holds a verdict rule only in memory (D8) |
| Cross-check delta | item 13 sends `delta:`; `60-crosscheck.md` asks for a full pass after a drift and ignores it (item 13, OQ-001) |

## Target

- **Front page, about 6 KB.** Frontmatter: `description`, `when_to_use`, `argument-hint: "[<pull request URL>]"`, no `user-invocable`. Body: purpose paragraph; `## Steps` by scope (cross-check, checkpoint, cumulative, pull request), each "open exactly the `checklists` of `summary.json`" plus the scope's order; `## Rules` holds severities, the evidence bar, the finding format and the verdict rule; `## Output` points at the reviewer shell's block. The prose load table goes: `review-checklists.mts` is the one copy.
- **Verdict rule gains the D8 memory:** a criterion missed on the good side still fails literally; grade the row FAIL, report `DRIFT` on the decision that states the bound, and ask for an amendment, never padded code. The memory file is deleted.
- **Noise (bundle 4.3):** "skip a finding the project's own gates already reject (analyzers as errors, architecture tests, lint, DB constraints); name the gate once on the `Checked:` line".
- **Checklists renamed** without `NN-` (`alignment.md`, `bar.md`, `traced.md`, `patterns-core.md`, `design-red-flags.md`, `patterns-security.md`, `framework-typescript.md`, `framework-dotnet.md`, `concern-clean-architecture.md`, `concern-vertical-slice.md`, `crosscheck.md`); `review-checklists.mts` changes in the same commit (draft 11, D-5).
- **D2:** the seven rows pass on code evidence or a recorded decision, never a comment, severities unchanged (T3: `!` with no earlier null check or narrowing in scope; N2 the same for C#; A1: no `await`, `.then()`, `.catch()` and no `void` prefix; E1: empty or comment-only `catch`, or one returning a value the return type cannot tell from success, with no logging or rethrow; Co1: parameter not named as an output; Na2: abbreviation not a codebase convention or glossary term; Uc2: no decision in the record states why). A repo test fails when a fail condition contains "no comment", "or comment" or "documented". In scope `pr`, a person's comment is a Minor recommendation and Uc2 takes its reason from the pull request description.
- **D7:** pull request mode moves to `steps/pr.md` (`# Reviewing: pull request`); `SKILL.md` keeps one line, "`/picket:reviewing <url>`, lead only: read `steps/pr.md`". `picket pullrequest post --dry-run` prints the code at the head line under each `path:line`, with a unit test; the step's manual line check goes.
- **Delta:** `crosscheck.md` re-checks only the `delta:` decisions and the phases they touch when the message carries `delta:`, and does a full pass otherwise.
- The Layout block goes.

## Decisions

- **D-1 The load table lives only in code.** Item 11 made the kernel pick the checklists; a second table in prose is the drift `BLOCK_FIELDS` was built to stop.
- **D-2 The verdict rule takes the memory, not the shell.** The rule is about grading, which the skill owns; the shell says how the reviewer works.
- **D-3 Renames land with the map in one commit.** The skills test and the summary test catch a stale name either way; one commit keeps every intermediate tree green.

## Migration

1. Checklist renames and `review-checklists.mts`; D2 rows and the "comment as pass" repo test.
2. `SKILL.md` front page; `steps/pr.md`; verdict rule with the memory; delta in `crosscheck.md`; the memory deleted by the lead.
3. `pullrequest post --dry-run` shows the code at each anchor.

## Risks

- The reviewer's spawn load drops by about 5 KB, but every review now depends on `summary.json` naming its checklists. A summary missing them would leave the reviewer with only the front page; the summary test pins `checklists` per scope.
- D2 makes seven rows stricter; projects that relied on a comment to pass them get new Major or Critical findings. That is the point, and the severities stay.

## Affects

`src/skills/reviewing/` (SKILL.md, checklists renamed, `steps/pr.md` new), `src/lib/shared/review-checklists.mts`, `src/lib/verbs/pullrequest/`, `test/repo/{skills,references}.test.mjs`, a new repo test for D2, `.claude/agent-memory/picket-reviewer/`, `docs/reference/`.

## Open questions

None.
