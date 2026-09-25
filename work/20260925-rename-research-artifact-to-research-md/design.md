---
kind: design
lane: design
title: Rename research artifact to research.md
date: 2026-09-25
audience: developer
sources: [request, ~/.local/share/claude/versions/2.1.282 (Write validation), .claude/lib/work.mjs, .claude/lib/packet.mjs, .claude/lib/route.mjs, .claude/lib/preflight.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/lint.schema.mjs, .claude/agents/analyst.md, .claude/rules/work-items.md, .claude/skills/documenting/SKILL.md, .claude/skills/documenting/scripts/filename.mjs, .claude/skills/researching/SKILL.md, .claude/skills/researching/steps/10-outline.md, .claude/skills/researching/steps/20-deep.md, .claude/skills/consulting/steps/10-discuss.md, .claude/skills/summarizing/SKILL.md, bench/adapters/rework.mjs, bench/lib/grade.mjs, test/kernel/next.test.mjs, test/kernel/packet.test.mjs, package.json]
phases:
  - n: 1
    files: [.claude/lib/work.mjs, .claude/lib/packet.mjs, test/kernel/next.test.mjs, test/kernel/packet.test.mjs, bench/adapters/rework.mjs, .claude/agents/analyst.md, .claude/rules/work-items.md, .claude/skills/documenting/SKILL.md, .claude/skills/researching/SKILL.md, .claude/skills/researching/steps/10-outline.md, .claude/skills/consulting/steps/10-discuss.md, .claude/skills/summarizing/SKILL.md]
    greps:
      - path: .claude/lib/work.mjs
        pattern: "research: .research.md."
      - path: .claude/lib/packet.mjs
        pattern: "ARTIFACT_BY_LANE"
      - path: bench/adapters/rework.mjs
        pattern: "research.md"
      - path: .claude/agents/analyst.md
        pattern: "work/<id>/research.md"
      - path: .claude/skills/researching/steps/10-outline.md
        pattern: "work/<id>/research.md"
    tests: true
    drive: false
  - n: 2
    files: [.claude/skills/documenting/scripts/filename.mjs, .claude/skills/documenting/SKILL.md, test/skills/filename.test.mjs]
    greps:
      - path: .claude/skills/documenting/scripts/filename.mjs
        pattern: "report|summary|findings|analysis"
      - path: .claude/skills/documenting/scripts/filename.mjs
        pattern: "about-"
      - path: .claude/skills/documenting/SKILL.md
        pattern: "about-"
      - path: test/skills/filename.test.mjs
        pattern: "about-reporting-pipeline-latency-analysis"
    tests: true
    drive: false
---
# Design: Rename research artifact to research.md

## Problem

Claude Code's built-in Write validation refuses any Write from a subagent whose file basename matches `/^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i`, with "Subagents should return findings as text, not write report files." Read in the 2.1.282 binary: the check is `s.agentId && <regex>.test(basename(path))`, so it hits only subagents, only `.md`, and only the basename's start. The analyst is a subagent and the research lane tells it to write `work/<id>/report.md`, so every research run fails at its one write. Binding user rulings: the new name is `research.md`; the kernel keeps no fallback to `report.md`; existing work items on disk are not renamed (the user fixes them by hand). The template `documenting/templates/report.md`, the document kind `report`, the verdict `REPORT WRITTEN` and the `## Report: <id>` heading stay as they are, because none of them is a basename a subagent writes.

## Decisions

### D-001: One kernel constant names the research artifact, with no fallback
**Decision:** Infrastructural decision. `ARTIFACT_BY_LANE.research` in `.claude/lib/work.mjs` becomes `"research.md"`, and it stays the only copy of the name in code: `readArtifact`, `deriveState` (`artifact_expected`), `route` and `preflight` already read it, and `packet.mjs` stops hard-coding `work/${id}/report.md` and builds the path from the same constant. Prose (agent shell, rules, skills, step files) names `work/<id>/research.md` literally, as it names `order.md` and `design.md` today. A research item that holds only `report.md` reads as "artifact not written", exactly as the user ruled.
**Instead of:** Read `research.md` and fall back to `report.md` when it is absent: the user ruled it out, and it would leave two names in the contract for every reader of `work/`.
**Risks:**
- **RISK-001** Open research items in other repos (D:\workspace\development) show `write_artifact` and "research.md not written yet" after the upgrade. Mitigation: the user renames them by hand (binding ruling); the preflight warning already names the expected file, so the cause is visible.
- **RISK-002** A prose reference to `report.md` survives, the analyst writes the old name, and the kernel ignores it. Mitigation: T-1.5 greps every harness surface and allows only `templates/report.md`.

### D-002: The document kind stays "report"; only the basename changes
**Decision:** Infrastructural decision. The kind `report`, its template path, the packet label `report`, the verdict `REPORT WRITTEN`, the `## Report: <id>` heading, `bench/lib/grade.mjs` (`checks.report`, `reportFiles`) and the standalone directory `artifacts/reports/` keep their names. Claude Code's rule tests the basename only, so `artifacts/reports/<slug>.md` is safe while the slug is (D-003).
**Instead of:** Rename the kind to `research` everywhere: it touches the closed verdict list in `CLAUDE.md` and `route.mjs`, two hooks' heading regexes, the bench lane detector and graders, and the documenting registry, all for no gain against a basename-only rule.
**Risks:**
- **RISK-003** A reader sees the label `report` next to the path `work/<id>/research.md` and thinks one is stale. Mitigation: the rules file says the research lane's artifact is `research.md`, a document of kind `report`.

### D-003: filename.mjs prefixes "about-" when a name would start with a blocked word
**Decision:** Infrastructural decision. `filename.mjs` gets one constant that mirrors Claude Code's rule, `/^(report|summary|findings|analysis)/i`, with a comment naming the Claude Code version and quoting the error text. Just before printing, the finished name (after suffixes such as `-analysis` and after any `NNNNN-` or `plan-` prefix) is tested against it; on a match the script prints `about-<name>`. The test is a prefix match on the string, not a whole-token match, because Claude Code's regex is: `reporting-pipeline` and `reports-monthly` are blocked too. It applies to every kind the script names, since the analyst also writes `artifacts/api/<slug>.md`; numbered kinds and `progress` never match because they start with digits or `plan-`, and `order`/`design` are fixed names.
**Instead of:** Drop the leading blocked word, like the existing "Analysis of" meta-strip: dropping is lossy for real subject words ("reporting pipeline latency" becomes `pipeline-latency-analysis`) and can empty the stem (`--kind api "GET /v1/summary"` reduces to zero tokens and the script dies on a valid subject). A prefix never loses a token and never fails.
**Risks:**
- **RISK-004** A later Claude Code release adds a word to its list (for example `NOTES`). Mitigation: the list is one constant with the source cited; widening it is a one-line change plus one test case.
- **RISK-005** A name the user expects changes (`summary-endpoint` becomes `about-summary-endpoint`). Mitigation: it happens only when the subject leads with a blocked word; existing files are never renamed, the script only names new ones.

## Scope

**In:**
- The research artifact basename in the kernel, its tests, the bench adapter, and every harness prose surface that names it.
- One naming rule in `filename.mjs`, its test, and one sentence in the documenting skill.

**Out:**
- Renaming or migrating any existing `work/*/report.md` (user ruling).
- Any read fallback to `report.md` (user ruling).
- The template `documenting/templates/report.md`, the kind `report`, `REPORT WRITTEN`, `## Report:` headings, `artifacts/reports/`.
- `bench/adapters/trunk.mjs` (the frozen baseline harness), `PLAN.md` (a dated historical plan), `tmp/`, `artifacts/reports/*` (they cite the template, not the artifact).

## Phase 1: The research lane writes research.md

**Touch set:**
- `.claude/lib/work.mjs`: line 27 constant, line 4 header comment
- `.claude/lib/packet.mjs`: line 141 literal path, import at line 8
- `test/kernel/next.test.mjs`: line 64 writes report.md
- `test/kernel/packet.test.mjs`: new research packet assertion
- `bench/adapters/rework.mjs`: line 54 `reportFiles` glob
- `.claude/agents/analyst.md`: lines 25 and 45
- `.claude/rules/work-items.md`: line 11 lane artifact list
- `.claude/skills/documenting/SKILL.md`: line 24 registry row
- `.claude/skills/researching/SKILL.md`: lines 43, 57, 62
- `.claude/skills/researching/steps/10-outline.md`: line 22
- `.claude/skills/consulting/steps/10-discuss.md`: line 3 `work/*/report.md`
- `.claude/skills/summarizing/SKILL.md`: line 32 `report.md` hooks

**Changes:**
- `work.mjs`: `ARTIFACT_BY_LANE = { fast: null, order: "order.md", design: "design.md", research: "research.md" }`; the header comment reads `work/<id>/{order,design,research}.md`.
- `packet.mjs`: import `ARTIFACT_BY_LANE` from `./work.mjs`; the `approve_phase` branch prints `field("report", \`work/${id}/${ARTIFACT_BY_LANE.research}\`, width)`. Label unchanged (D-002).
- `next.test.mjs`: the research case writes `research.md`. Add one assertion before it: a research item holding only `report.md` still answers `write_artifact` (pins the no-fallback ruling).
- `packet.test.mjs`: one test that renders the packet for a research item with a `research.md` holding a `## Summary` and asserts the text contains `work/<id>/research.md`.
- `rework.mjs`: `reportFiles` globs `work/*/research.md` and `artifacts/reports/*.md`.
- Prose: replace each `work/<id>/report.md`, `work/*/report.md` and the bare `report.md` artifact mention with the `research.md` form. In `work-items.md` write "`research.md` (research lane, a document of kind `report`)". In the documenting registry change only the "Lives at" cell of the `report` row. Leave every `templates/report.md` reference and `20-deep.md` (it names no path) as they are.

**Done when:**
- **T-1.1** `.claude/lib/work.mjs` exports `ARTIFACT_BY_LANE.research === "research.md"` and its header comment names `{order,design,research}.md`.
- **T-1.2** `harness packet` for a research item whose `research.md` exists prints a `report` line with `work/<id>/research.md`, and `packet.mjs` has no `report.md` literal.
- **T-1.3** In `test/kernel/next.test.mjs` a research item with only `report.md` answers `write_artifact`, and with `research.md` answers `approve_phase`.
- **T-1.4** `reportFiles` in `bench/adapters/rework.mjs` returns `work/*/research.md` and `artifacts/reports/*.md` matches, and no `report.md` glob.
- **T-1.5** `grep -rn "report\.md" .claude/agents .claude/rules .claude/skills .claude/lib .claude/hooks bench/adapters/rework.mjs bench/lib CLAUDE.md` prints only lines that contain `templates/report.md`; under `test/` the only hit is the no-fallback assertion of T-1.3.
- **T-1.6** `npm test` passes, budgets included.

## Phase 2: filename.mjs never names a blocked basename

**Touch set:**
- `.claude/skills/documenting/scripts/filename.mjs`: guard before each final print
- `.claude/skills/documenting/SKILL.md`: line 33 filename rule sentence
- `test/skills/filename.test.mjs`: new; `npm test` runs `node --test test/` recursively [INFERRED from the existing `test/hooks/` and `test/kernel/` subdirectories]

**Changes:**
- `filename.mjs`: a module constant `BLOCKED_BASENAME = /^(report|summary|findings|analysis)/i` with a two-line comment: it mirrors Claude Code's subagent Write check (2.1.282, `/^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i` on the basename, "Subagents should return findings as text, not write report files"), and a match gets the `about-` prefix (D-003). Every branch that prints a name passes it through one small guard (for example `safe(name)` returning `about-${name}` on a match, else `name`); the simplest shape is to compute the name per branch and write once at the end. The fixed `work/<id>/{order,design}.md` branch is untouched. Add `about-` to the header comment's description of the output.
- `SKILL.md`: extend the filename sentence in Shared rules with one clause: a name that would start with report, summary, findings or analysis gets an `about-` prefix, because Claude Code refuses such a basename from a subagent.
- `test/skills/filename.test.mjs`: runs the script with `execFileSync(process.execPath, [script, "--kind", kind, subject])` and asserts the exact stdout for the cases in T-2.1 to T-2.4. No numbered kinds (their output depends on the repo's `artifacts/` contents).

**Done when:**
- **T-2.1** `--kind report "Report on invoice pricing"` prints `about-report-invoice-pricing-analysis` (today: `report-invoice-pricing-analysis`).
- **T-2.2** `--kind report "reporting pipeline latency"` prints `about-reporting-pipeline-latency-analysis`: the match is a string prefix, as in Claude Code's regex, not a whole token.
- **T-2.3** `--kind api "GET /v1/summary"` prints `about-summary` and `--kind api "GET /v1/reports/monthly"` prints `about-reports-monthly`.
- **T-2.4** Names that do not start with a blocked word are unchanged: `--kind report "invoice pricing"` prints `invoice-pricing-analysis`, `--kind report "Analysis of pricing"` prints `pricing-analysis`.
- **T-2.5** `.claude/skills/documenting/SKILL.md` states the `about-` rule in one clause and stays within its 150-line budget.
- **T-2.6** `npm test` passes and includes `test/skills/filename.test.mjs`.

## Open questions

none

## Revision log
