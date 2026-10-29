---
kind: design
lane: design
title: Documenting and consulting skills, picket name
date: 2026-10-29
audience: developer
sources:
  - work/20261029-documenting-and-consulting-skills-picket-name/request.md
  - artifacts/refactor/15-documenting-and-consulting.md
  - artifacts/reports/instructions-candidates-2026-10-25.md (D1, D6, D10 outcomes, lines 88 and 93)
  - work/20261025-agent-and-skill-structure-deep-dive/research.md (R-025, R-030, R-037)
  - src/skills/documenting/SKILL.md, scripts/filename.mjs, templates/report.md, templates/sdr.md, templates/design.md
  - src/skills/consulting/SKILL.md, steps/10-discuss.md, steps/20-ratify.md
  - src/skills/researching/SKILL.md, steps/outline.md, steps/deep.md; src/skills/reviewing/SKILL.md (bundle 2 shape)
  - src/agents/analyst.md
  - src/lib/hooks/lint/schema/index.mts, src/lib/hooks.mts, src/lib/hooks/guard/scope/index.mts
  - src/lib/shared/route/route.mts, plan.mts, apply.mts, commit.mts; src/lib/shared/verdicts.mjs
  - src/lib/shared/work/next-step.mts, report.mts, verdict-log.mts, files.mts, state.mts
  - src/lib/verbs/reply/index.mts, table.mts; src/lib/verbs/route/index.mts; src/lib/verbs/close/close.mts; src/lib/verbs/packet/packet.mjs
  - src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts
  - test/cli/filename.test.mjs, test/hooks/lint.schema.test.mjs, test/repo/skills.test.mjs, references.test.mjs, conventions.test.mjs
  - docs/reference/agents.md, skills.md
  - every work/*/research.md and artifacts/reports/*.md, measured with a scratch script
phases:
  - n: 1
    files: [src/lib/shared/document-path.mts, src/lib/shared/document-path.test.mts, src/lib/verbs/name/index.mts, src/lib/verbs/name/index.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/hooks/guard/bash/kernel.test.mts, src/skills/documenting/SKILL.md, src/skills/documenting/templates/sdr.md, src/skills/documenting/templates/api.md, test/repo/document-names.test.mjs, test/repo/conventions.test.mjs, test/repo/references.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs.mts
        pattern: '^\s+name: \{ summary: "[^"]+", readOnly: true \}'
      - path: docs/reference/cli.md
        pattern: '^## picket name\b'
      - path: src/lib/hooks/guard/bash/kernel.test.mts
        pattern: '"name"'
      - path: src/skills/documenting/SKILL.md
        pattern: '`artifacts/strategy/charters/<slug>\.md`'
      - path: src/skills/documenting/templates/sdr.md
        pattern: 'picket name <kind>'
      - path: src/skills/documenting/templates/api.md
        pattern: 'picket name api'
      - path: src/lib/shared/document-path.mts
        pattern: '^(?![\s\S]*about-)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/hooks/lint/schema/index.mts, src/lib/hooks/lint/schema/report.mts, src/lib/hooks/lint/schema/report.test.mts, test/hooks/lint.schema.test.mjs, src/lib/hooks.mts, docs/reference/hooks.md, work/20261008-why-permission-prompts-rose-on-the-plugin/research.md]
    greps:
      - path: src/lib/hooks/lint/schema/report.mts
        pattern: 'export function reportProblems'
      - path: src/lib/hooks/lint/schema/index.mts
        pattern: 'research\.md'
      - path: src/lib/hooks.mts
        pattern: '"lint\.schema": \{\s+summary: "[^"]*report'
      - path: work/20261008-why-permission-prompts-rose-on-the-plugin/research.md
        pattern: '^(?![\s\S]*\[VERIFIED(,| that))'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/route.mts, src/lib/shared/work/verdict-log.mts, src/lib/verbs/route/index.mts, src/lib/verbs/close/close.mts, test/cli/route.test.mjs, test/cli/close.test.mjs, docs/reference/cli.md]
    greps:
      - path: src/lib/shared/route/plan.mts
        pattern: 'kind: "publish"'
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'published\?: string'
      - path: src/lib/verbs/route/index.mts
        pattern: '\[--publish\]'
      - path: docs/reference/cli.md
        pattern: '--publish'
      - path: src/lib/verbs/close/close.mts
        pattern: 'published'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/index.test.mts, src/agents/analyst.md, src/skills/researching/SKILL.md, test/repo/agents.test.mjs, docs/reference/agents.md, docs/reference/skills.md]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: '\[p\] accept and publish to'
      - path: src/lib/verbs/reply/table.mts
        pattern: 'publish'
      - path: src/agents/analyst.md
        pattern: '^(?![\s\S]*artifacts/(reports|api))'
        flags: i
      - path: src/skills/researching/SKILL.md
        pattern: 'picket reply <id> p'
      - path: test/repo/agents.test.mjs
        pattern: 'REPORT\|SUMMARY\|FINDINGS\|ANALYSIS'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/skills/documenting/SKILL.md, src/skills/consulting/SKILL.md, src/skills/consulting/steps/discuss.md, src/skills/consulting/steps/ratify.md, test/repo/skills.test.mjs, test/repo/references.test.mjs, docs/reference/skills.md]
    greps:
      - path: src/skills/documenting/SKILL.md
        pattern: '^argument-hint: "<kind> <subject> \[--export\]"'
      - path: src/skills/documenting/SKILL.md
        pattern: '^(?![\s\S]*user-invocable)'
        flags: i
      - path: src/skills/documenting/SKILL.md
        pattern: 'Orders and designs carry no markers in their prose; a touch set path the architect is unsure of is marked `\[INFERRED\]`'
      - path: src/skills/consulting/SKILL.md
        pattern: '^(?![\s\S]*user-invocable)'
        flags: i
      - path: src/skills/consulting/SKILL.md
        pattern: 'steps/ratify\.md'
      - path: src/skills/consulting/steps/discuss.md
        pattern: '^# Consulting: discuss\b'
      - path: src/skills/consulting/steps/ratify.md
        pattern: '^# Consulting: ratify\b'
      - path: src/skills/consulting/steps/ratify.md
        pattern: 'picket name'
    tests: true
    drive: false
    security: false
---
# Design: Documenting and consulting skills, picket name

## Problem

Item 15 of the refactor (`artifacts/refactor/15-documenting-and-consulting.md`) carries D1 and D6 of `artifacts/reports/instructions-candidates-2026-10-25.md` (lines 88 and 93) and bundle 2's skill shape for `documenting` and `consulting`. Three defects bind it. `documenting/SKILL.md:35,39` misstate the frontmatter and the markers (R-037). The report caps are an unchecked HTML comment (R-025). The filename script is reached through `${CLAUDE_PLUGIN_ROOT}`, which is empty in Bash, and its `about-` prefix exists only because the analyst may write a standalone report, which Claude Code refuses for some names. Two premises in the draft do not hold in this repo and are corrected here: no `artifacts/reports/*.md` carries `kind: report` and all seven `work/*/research.md` carry `confidence`; the reports that fail the new checks are `work/20261008-why-permission-prompts-rose-on-the-plugin/research.md` (two improvised markers, R-009 and R-019), `work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md` (six ids in its Summary), and the two `work/20261017-compare-*` reports (77 and 66 findings). A report file has no "top findings" construct; the analyst's block does (`src/agents/analyst.md:64,72`).

## Decisions

### D-001: Naming is a shared module, `picket name` a thin read-only verb
**Decision:** The slug and path rules move from `filename.mjs` into `src/lib/shared/document-path.mts`, with a pure `documentRel(kind, { subject, work, sequence })` and an fs-reading `nameDocument(root, { kind, subject, work })` that adds the SDR sequence and `exists`. `src/lib/verbs/name/` parses and prints. The research gate (`next-step.mts`) and the route service both need the report path, and the layer rule forbids a verb importing another verb, so the rules cannot live in the verb. Infrastructural decision.
**Instead of:** moving `filename.mjs` and its test into `src/lib/verbs/name/` as they are: the gate and the publish copy could not reach the path rules.
**Risks:**
- **RISK-001** Writers that ran the script by hand break. Mitigation: no run since the plugin layout used it (D6 evidence); every citer moves to the verb in phase 1.

### D-002: One folder per kind, project-relative path, an `exists` line
**Decision:** `picket name <kind> "<subject>" [--work <id>]` prints one project-relative POSIX path: `artifacts/reports/<slug>.md`, `artifacts/strategy/charters/<slug>.md`, `artifacts/strategy/context-maps/<slug>.md`, `artifacts/strategy/glossary/<slug>.md`, `artifacts/strategy/decisions/NNNNN-<slug>.md`, `artifacts/api/<slug>.md`, and `work/<id>/<order|design>.md` with `--work` (required there, refused elsewhere). A second line `exists` follows when the file is there. The slug keeps today's pipeline (method strip for api, meta prefix strip, lowercase, separators, stopwords, api noise, five tokens) and drops the kind suffixes and the `about-` prefix; existing report names stay. The registry's "Lives at" column holds exactly these forms, and a repo test compares the two. The glossary path follows D3's approved location; the short MEMORY.md entries stay D3's.
**Instead of:** an absolute path: the registry comparison would need the root stripped, and every other verb prints `work/<id>/...` relative; the writer joins the project root once for the Write tool.
**Risks:**
- **RISK-002** A writer overwrites a file it should update. Mitigation: the `exists` line, and the documenting Steps say an `exists` line means update.

### D-003: Report lint is a sibling module of lint.schema, checked on write only
**Decision:** `src/lib/hooks/lint/schema/report.mts` exports `reportProblems(text): string[]`; `lintSchema` sends `work/<id>/research.md` there always and `artifacts/reports/*.md` (top level only) when its frontmatter says `kind: report`. Checks: `kind` is `report`; `confidence` is high, medium or low; each line opening `- **R-###**` has exactly one of `[VERIFIED]`, `[INFERRED]`, `[ASSUMED]` right after the id, or `[withdrawn]`; at most 50 such lines; at most 120 words in a finding, counted after the id through its continuation lines; at most 3 distinct `\bR-\d{3}\b` ids cited under `## Summary` (the template's "top findings in the summary"); no unfilled placeholder and no HTML comment, through the existing `leftoverProblems`. Not checked: the weakest-marker rule, charters, SDRs, context maps, glossary entries, `artifacts/api/`. Committed reports are not swept; the hook fires when a report is written, as for orders and designs.
**Instead of:** checking "top findings" on the analyst's `Top findings:` block line: that is a turn reply, not the file, and the request puts the cap in `lint.schema`.
**Risks:**
- **RISK-003** A summary that names its top findings without ids escapes the cap. Mitigation: accepted; the analyst block still caps them at three.

### D-004: Publishing is a route effect on the research approval
**Decision:** `RouteInput` gains `publish?: boolean` (`picket route … --publish`). On a research item the user's `approved` plans no markers; with `publish` it plans one `publish` change from `work/<id>/research.md` to `documentRel("report", { subject: state.title })`. `applyChanges` runs a publish change before markers, state and the verdict row: a target with other bytes is refused and nothing is written; identical bytes succeed with no copy. The verdict row gains `published: <path>`, and `picket close` adds each published path to what it stages and owns, so the copy lands in the close commit. `--publish` on another lane or verdict is refused.
**Instead of:** `picket close --publish`: the request names reply and route, and close would gain a second job beside committing.
**Risks:**
- **RISK-004** A six-word title yields a name that collides with an older report. Mitigation: the refusal names the existing path; the user renames with `picket set <id> --title`.

### D-005: `picket reply` takes only `p` on a research item
**Decision:** `next-step.mts` offers `[a] accept`, `[p] accept and publish to <path>`, `[d] deeper pass`, `[x] reject: <why>`; `[p]` is left out when the title yields no slug. `matchReply` gains a research form set holding only `p` (or `publish`), which routes `approved` with `publish`; research items skip block proposals. `a`, `d` and `x` on a research item stay the lead's, and the refusal says so.
**Instead of:** moving every research reply into `picket reply`: `d` and `x` send the analyst a three-line message the researching steps own, and the bench answers `a` by letter today.

### D-006 (r2): The analyst's write scope is prose plus a name test
**Decision:** `analyst.md` Constraints say it writes only inside `work/<id>/` and `.claude/PROJECT-MAP.md` (its memory folder stays). API references leave the analyst: the lead writes them standalone through `/picket:documenting api`, at the path `picket name api` prints, so the registry's api row names the lead as writer and `templates/api.md:3` cites the verb. A repo test asserts no `WORK_FILES` entry and no backticked `.md` path in `src/agents/*.md` has a basename matching Claude Code's refused `^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$` (case-insensitive).
**Instead of:** a per-agent write guard in `guard.scope`: no agent has one today, and the refusal only bites names the test now covers.

### D-007: Bundle 2's shape, documenting without a steps folder
**Decision:** Both SKILL.md files take `description`, `when_to_use` (the current "Use when" phrasings, unchanged in wording), `argument-hint` (`"<kind> <subject> [--export]"` and `"[<question>]"`), no `user-invocable`, a purpose paragraph, then `## Steps` as one ordered list, `## Rules`, `## Output`. Documenting's Steps are the standalone use; its registry table moves under Rules. Consulting's steps become `steps/discuss.md` and `steps/ratify.md`, headed `# Consulting: discuss` and `# Consulting: ratify`, each with an ordered list. `understanding` is untouched (D4).
**Instead of:** a `steps/standalone.md` for documenting: five lines of procedure do not earn a file the preload then names.

## Scope

**In:**
- `picket name`, its shared module, the registry column and comparison test; `filename.mjs` and its test removed
- `lint.schema` over reports; the 20261008 markers fixed
- `route --publish`, `reply p`, the `[p]` research option, close committing the copy
- the analyst's write scope, the refused-name test, the researching skill text
- `documenting` and `consulting` in bundle 2's shape; docs pages that describe them

**Out:**
- `understanding` and its merge into `consulting` (D4), the glossary entry shape and MEMORY.md rows (D3)
- the export command's `${CLAUDE_PLUGIN_ROOT}` path form (bundle 3), `api.md` frontmatter (bundle 6)
- renaming committed reports; the three committed reports that fail a cap (OQ-001)

## Phase 1: picket name replaces the filename script

**Touch set:**
- `src/lib/shared/document-path.mts`: new; slug and path rules
- `src/lib/shared/document-path.test.mts`: new; unit tests
- `src/lib/verbs/name/index.mts`: new; thin verb
- `src/lib/verbs/name/index.test.mts`: new; parse and render tests
- `src/lib/verbs.mts`: `name` entry, `readOnly: true`
- `src/lib/cli/registry.mts`: register `name`
- `src/lib/hooks/guard/bash/kernel.test.mts`: `READ_VERBS` gains `name`
- `src/skills/documenting/scripts/filename.mjs`: deleted
- `test/cli/filename.test.mjs`: deleted; cases move to the unit tests
- `src/skills/documenting/SKILL.md`: filename sentence, registry "Lives at"
- `src/skills/consulting/steps/20-ratify.md`: path column and filename line
- `src/skills/documenting/templates/sdr.md`: location comment cites the verb
- `src/skills/documenting/templates/api.md`: line 3 path cites the verb
- `test/repo/document-names.test.mjs`: new; registry against `documentRel`
- `test/repo/conventions.test.mjs`: line 120 names `export.mjs`
- `test/repo/references.test.mjs`: line 151 fixture names `export.mjs`
- `docs/reference/cli.md`: regenerated by `npm run docs`

**Changes:** `document-path.mts` exports `DOCUMENT_KINDS` (`order`, `design`, `report`, `charter`, `context-map`, `sdr`, `glossary`, `api`), `documentSlug(kind, subject): string | null` (null when no token survives), `documentRel(kind, { subject?, work?, sequence? }): string` (pure, D-002 folders) and `nameDocument(root, { kind, subject?, work? }): { path: string; exists: boolean }` (next free five-digit sequence from `artifacts/strategy/decisions/`, then existence). Unknown kinds, a missing subject, a zero-token subject, `--work` missing on order or design and `--work` on any other kind are `UsageError`s; the unknown-kind message lists the kinds. The verb's usage is `name <kind> "<subject>" [--work <id>]`, `output: "text"`, rendering the path line and, when present, `exists`. `document-names.test.mjs` parses the registry rows of `src/skills/documenting/SKILL.md` whose first cell is a kind, takes the first backticked path of the last cell, substitutes `<slug>`, `<id>` and `NNNNN`, and compares with `documentRel`; it also asserts every kind has one row, and a unit case shows one changed cell is reported. The documenting registry keeps its four columns; the report row's "Written by" names the analyst in `work/<id>/research.md` and the lead standalone, and the api row's names the lead standalone (D-006). The ratify table's path column and the `sdr.md` location comment name `picket name <kind> "<subject>"`; `templates/api.md:3` reads ``**Artifact path:** printed by `picket name api "<subject>"` ``.

**Done when:**
- **T-1.1** `picket name report "Report on invoice pricing"` prints `artifacts/reports/report-invoice-pricing.md` alone when the file is absent, and the same line plus `exists` when it is present.
- **T-1.2** In a project whose `artifacts/strategy/decisions/` holds `00003-x.md`, `picket name sdr "pricing"` prints `artifacts/strategy/decisions/00004-pricing.md`, from the root and from a subfolder.
- **T-1.3** `picket name design --work 20261029-x` prints `work/20261029-x/design.md`; `design` without `--work`, `report` with `--work`, and the kinds `adr`, `plan`, `progress` each exit with a usage error naming the problem.
- **T-1.4** `src/skills/documenting/scripts/filename.mjs` and `test/cli/filename.test.mjs` are gone, and `git grep -l filename.mjs -- src test docs ':!src/lib/util/yaml-lite-corpus.test.json'` prints nothing.
- **T-1.5** `test/repo/document-names.test.mjs` passes on the registry and its unit case fails a table with one altered "Lives at" cell.
- **T-1.6** `kernelClass("name")` is `safe`, and `docs/reference/cli.md` carries a `## picket name` section.
- **T-1.7** `npm test` passes.
- **T-1.8** The registry's api row names the lead, not the analyst, as writer, and `src/skills/documenting/templates/api.md` line 3 names `picket name api`.

## Phase 2: lint.schema checks reports

**Touch set:**
- `src/lib/hooks/lint/schema/index.mts`: route report paths to the new module
- `src/lib/hooks/lint/schema/report.mts`: new; `reportProblems`
- `src/lib/hooks/lint/schema/report.test.mts`: new; unit tests per check
- `test/hooks/lint.schema.test.mjs`: bundle-level cases for both paths
- `src/lib/hooks.mts`: `lint.schema` summary names reports
- `docs/reference/hooks.md`: regenerated by `npm run docs`
- `work/20261008-why-permission-prompts-rose-on-the-plugin/research.md`: R-009 and R-019 markers

**Changes:** `lintSchema` keeps `ARTIFACT` for orders and designs and adds two report paths: `^work/[^/]+/research\.md$` always, `^artifacts/reports/[^/]+\.md$` only when the parsed frontmatter `kind` is `report`. `reportProblems(text): string[]` runs the D-003 checks over the frontmatter and body and reuses `leftoverProblems`; each problem names the finding id where there is one (`R-009 opens with "[VERIFIED, corrected from the outline]", not one marker`). The caps are module constants (50, 120, 3). The decision revision protocol and phase checks stay for orders and designs only. In the 20261008 report, R-009 opens `[VERIFIED]` with "corrected from the outline" moved into its sentence, and R-019, a mixed finding, opens `[INFERRED]` (the weakest marker), its wording otherwise kept.

**Done when:**
- **T-2.1** Writing a `work/<id>/research.md` with `confidence: certain`, or with `kind: design`, makes `lint.schema` return context naming that field.
- **T-2.2** Finding lines `- **R-003** [VERIFIED, corrected]`, `- **R-003** [VERIFIED] [INFERRED] x` and `- **R-003** x` are each reported with `R-003`; `- **R-004** [withdrawn] x` and `- **R-005** [ASSUMED] x` are not.
- **T-2.3** A report with 51 finding lines is reported and one with 50 is not; a finding of 121 words after its id is reported with its id and one of 120 is not.
- **T-2.4** A Summary citing four distinct ids is reported and one citing three is not; `SDR-00001` in the Summary counts as no id.
- **T-2.5** A report holding an unfilled placeholder or an HTML comment is reported; an `artifacts/reports/x.md` without `kind: report` gets no context, and with it the report checks run; the existing order and design cases still pass.
- **T-2.6** The 20261008 report's R-009 and R-019 lines each open with one marker, and `reportProblems` over it returns nothing.
- **T-2.7** `npm test` passes, with `docs/reference/hooks.md` regenerated and staged.

## Phase 3: route --publish copies the report

**Touch set:**
- `src/lib/shared/route/plan.mts`: `publish` input, change kind, research approval
- `src/lib/shared/route/plan.test.mts`: plan cases for research approval
- `src/lib/shared/route/apply.mts`: publish applied first, refusal before writes
- `src/lib/shared/route/route.mts`: misuse refusal, `published` on the row
- `src/lib/shared/work/verdict-log.mts`: `published?: string` on `VerdictRow`
- `src/lib/verbs/route/index.mts`: `--publish` flag and usage
- `src/lib/verbs/close/close.mts`: stage and own published paths
- `test/cli/route.test.mjs`: publish through the CLI
- `test/cli/close.test.mjs`: close commits the published copy
- `docs/reference/cli.md`: regenerated by `npm run docs`

**Changes:** `RouteInput` gains `publish?: boolean`; `parseRoute` reads it with `flag(args, "publish")`. `Change` gains `{ kind: "publish"; from: string; to: string; line: string }` with project-relative paths. `phaseApproved` checks the lane first: on a research item it returns `[]`, or one publish change when `planned.publish` is set and `documentRel("report", { subject: snap.state.title })` yields a path; a title with no slug is refused. `route()` refuses `publish` on another lane or with a verdict whose effect is not `phase_approved`. `applyChanges` applies publish changes before anything else: a target with the same bytes gives the line `already published to <to>`, other bytes throw `Refused` naming the target, an absent one is created with its folders and the line is `published <from> to <to>`. The verdict row carries `published: <to>` when a publish change was planned. `close` reads `snap.verdicts` for `published` values and adds them to the `add` list and the owner matcher of `commitClose`.

**Done when:**
- **T-3.1** On a research item titled "Pricing rules" with `research.md`, `picket route <id> --verdict approved --agent user --publish` creates `artifacts/reports/pricing-rules.md` byte-identical to `research.md`, prints `published work/<id>/research.md to artifacts/reports/pricing-rules.md`, and the last verdict row has `published: artifacts/reports/pricing-rules.md`.
- **T-3.2** When that target holds other bytes, the route is refused naming it, the target is unchanged and no verdict row is appended; with identical bytes the route succeeds and prints `already published to artifacts/reports/pricing-rules.md`.
- **T-3.3** `--publish` on an order or design item, or with `--verdict rejected`, is refused; `approved` on a research item without `--publish` appends a verdict row and creates no file under `artifacts/` and no `phases/` marker.
- **T-3.4** `picket close <id>` after a publish commits `work/<id>/` and `artifacts/reports/pricing-rules.md` in one commit.
- **T-3.5** The route usage in `docs/reference/cli.md` shows `[--publish]`, and `npm test` passes.

## Phase 4: the research gate offers publish

**Touch set:**
- `src/lib/shared/work/next-step.mts`: `[p]` option on the research gate
- `src/lib/shared/work/next-step.test.mts`: options with and without a slug
- `src/lib/verbs/reply/table.mts`: research form set, `publish` match
- `src/lib/verbs/reply/index.mts`: research items take `p` only
- `src/lib/verbs/reply/index.test.mts`: replaces "a research item takes no reply"
- `src/agents/analyst.md`: Constraints write scope
- `src/skills/researching/SKILL.md`: Steps, Rules and Output name `p`
- `test/repo/agents.test.mjs`: refused-name test
- `docs/reference/agents.md`: analyst paragraph, no standalone reports
- `docs/reference/skills.md`: researching gate options

**Changes:** The research step's options become `[a] accept`, `[p] accept and publish to <documentRel("report", title)>`, `[d] deeper pass`, `[x] reject: <why>`, the `[p]` entry left out when the title has no slug. `Matched` gains `{ kind: "publish" }`; `formsFor` returns a research set with one form, `/^(?:p|publish)$/i`, letter `p`. `applyReply` stops refusing every research item: on one, it skips block proposals, matches the research set, and a non-match is refused with "on a research item reply takes p; a, d and x are the lead's (picket:researching)". The publish match routes `approved` with `publish: true`. The analyst's Constraints line names `work/<id>/` and `.claude/PROJECT-MAP.md` only, and says a report leaves the work item only through the research gate's `[p]`, a kernel copy. The researching skill's step 2 and step 3 add "`p` runs `picket reply <id> p`, then closes as `a` does"; the Rules sentence about reply refusing research items says reply takes `p` only; the Output packet example shows the four options. The agents test collects `WORK_FILES` and every backticked `.md` path in `src/agents/*.md`, and asserts no basename matches the refused pattern, with a unit case on `work/<id>/summary.md`.

**Done when:**
- **T-4.1** `picket next` on a research item titled "Pricing rules" with `research.md` lists exactly `[a] accept`, `[p] accept and publish to artifacts/reports/pricing-rules.md`, `[d] deeper pass`, `[x] reject: <why>`; with a title of stopwords only, `[p]` is absent.
- **T-4.2** `picket reply <id> p` on that item creates the published copy and prints the publish line; `a`, `d` and `x` are refused with a message naming them as the lead's; the order and design reply tests pass unchanged.
- **T-4.3** `src/agents/analyst.md` names neither `artifacts/reports` nor `artifacts/api`, and its Constraints name `work/<id>/` and `.claude/PROJECT-MAP.md`.
- **T-4.4** The refused-name test passes on the repo and its unit case reports `summary.md`.
- **T-4.5** `src/skills/researching/SKILL.md` names `picket reply <id> p` and no longer says reply refuses research items; the analyst and researching paragraphs in `docs/reference/` match.
- **T-4.6** `npm test` passes.

## Phase 5: documenting and consulting in bundle 2's shape

**Touch set:**
- `src/skills/documenting/SKILL.md`: rewritten in bundle 2's shape
- `src/skills/consulting/SKILL.md`: rewritten in bundle 2's shape
- `src/skills/consulting/steps/10-discuss.md`: renamed to `discuss.md`
- `src/skills/consulting/steps/20-ratify.md`: renamed to `ratify.md`
- `src/skills/consulting/steps/discuss.md`: header and ordered list
- `src/skills/consulting/steps/ratify.md`: header, ordered list, `picket name`
- `test/repo/skills.test.mjs`: drop the documenting and consulting `PENDING` entries
- `test/repo/references.test.mjs`: line 151 fixture names `ratify.md`
- `docs/reference/skills.md`: documenting paragraph
- `test/repo/description-cases.json`: only if routing share drops [INFERRED]

**Changes:** Per D-007. Documenting's Steps, in order: run `picket name <kind> "<subject>"` (an `exists` line means update the file); read `templates/<kind>.md`; write the document; on `--export`, run the export command as it reads today; reply with the path. Its Rules hold the registry table (phase 1's columns and cells), then one paragraph each for frontmatter, audience, markers, typed ids and export. The frontmatter sentence lists `kind`, `title`, `date`, `audience`, `sources`; reports and strategy documents add `confidence`; orders and designs add `lane` and `phases`; the API reference has none, by design (external readers, Word export). The marker paragraph ends with the D1 sentence verbatim: "Orders and designs carry no markers in their prose; a touch set path the architect is unsure of is marked `[INFERRED]`." Consulting's Steps list names `steps/discuss.md` and `steps/ratify.md` with their triggers; Rules and Output keep today's content. Each step file keeps its content, recast as an ordered list where it is a sequence. Use `git mv` for the renames.

**Done when:**
- **T-5.1** `PENDING` in `test/repo/skills.test.mjs` names no path under `src/skills/documenting/` or `src/skills/consulting/`, and the skills test passes.
- **T-5.2** Both SKILL.md files carry `description`, `when_to_use` with "Use when", `argument-hint`, and no `user-invocable`.
- **T-5.3** The documenting frontmatter and marker sentences read as the Changes give them.
- **T-5.4** `src/skills/consulting/steps/` holds exactly `discuss.md` and `ratify.md`, opening `# Consulting: discuss` and `# Consulting: ratify`, each with an ordered list; `ratify.md` names `picket name`.
- **T-5.5** `git diff --stat <base>.. -- src/skills/understanding` is empty.
- **T-5.6** `npm test` passes, the routing and budget tests included.

## Open questions

- **OQ-001** Three committed reports fail a D-003 cap: `work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md` cites six ids in its Summary, and `work/20261017-compare-agent-skills-with-picket-skills/research.md` and `work/20261017-compare-cursor-pstack-with-picket-skills/research.md` hold 77 and 66 findings. Bringing them under the caps means rewriting closed research, not fixing a format. Owner: user. Fallback: they stay as written; the hook fires only when a report is written, so no check fails on them until someone edits one.

## Revision log
- 2026-10-29: D-006 (r2): the lead writes API references standalone; the registry api row and templates/api.md:3 follow in phase 1; cross-check Major.
