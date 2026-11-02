---
kind: order
lane: order
title: Reviewing skill front page and checklists
date: 2026-10-29
audience: developer
sources: [request.md, preflight.txt, artifacts/refactor/14-reviewing.md, src/skills/reviewing/SKILL.md, src/skills/reviewing/checklists/, src/skills/expediting/SKILL.md, src/skills/implementing/SKILL.md, src/agents/reviewer.md, src/lib/shared/review-checklists.mts, src/lib/shared/review-checklists.test.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/summary/index.test.mts, src/lib/shared/work/send.mts, src/lib/verbs/pullrequest/, test/repo/skills.test.mjs, test/repo/references.test.mjs, test/repo/docs.test.mjs, test/repo/description-cases.json, test/timing/budgets.test.mjs, scripts/test.mjs, scripts/docs.mjs, docs/reference/skills.md, docs/reference/cli.md, .claude/agent-memory/picket-reviewer/, .claude/rules/harness-authoring.md]
phases:
  - n: 1
    files: [src/skills/reviewing/checklists/alignment.md, src/skills/reviewing/checklists/bar.md, src/skills/reviewing/checklists/traced.md, src/skills/reviewing/checklists/patterns-core.md, src/skills/reviewing/checklists/design-red-flags.md, src/skills/reviewing/checklists/patterns-security.md, src/skills/reviewing/checklists/framework-typescript.md, src/skills/reviewing/checklists/framework-dotnet.md, src/skills/reviewing/checklists/concern-clean-architecture.md, src/skills/reviewing/checklists/concern-vertical-slice.md, src/skills/reviewing/checklists/crosscheck.md, src/lib/shared/review-checklists.mts, src/lib/shared/review-checklists.test.mts, src/lib/verbs/summary/index.test.mts, src/skills/reviewing/SKILL.md, test/repo/skills.test.mjs, test/repo/references.test.mjs, test/repo/checklists.test.mjs]
    greps:
      - path: src/lib/shared/review-checklists.mts
        pattern: '"alignment\.md"'
      - path: src/lib/shared/review-checklists.mts
        pattern: '^(?![\s\S]*\d\d-[a-z-]+\.md)'
        flags: i
      - path: src/skills/reviewing/SKILL.md
        pattern: '^(?![\s\S]*\d\d-[a-z-]+\.md)'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: '^(?![\s\S]*reviewing/checklists/)'
        flags: i
      - path: test/repo/checklists.test.mjs
        pattern: 'documented'
      - path: src/skills/reviewing/checklists/framework-typescript.md
        pattern: '\| T3 \|[^\n]*narrowing'
      - path: src/skills/reviewing/checklists/concern-clean-architecture.md
        pattern: '\| Uc2 \|[^\n]*no decision in the record'
    tests: true
    drive: false
  - n: 2
    files: [src/lib/verbs/pullrequest/remote.mts, src/lib/verbs/pullrequest/remote.test.mts, src/lib/verbs/pullrequest/prepare.mts, src/lib/verbs/pullrequest/post.mts, src/lib/verbs/pullrequest/post.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs/pullrequest/remote.mts
        pattern: 'export function mergeRef\b'
      - path: src/lib/verbs/pullrequest/remote.mts
        pattern: 'export function resolveRepo\b'
      - path: src/lib/verbs/pullrequest/prepare.mts
        pattern: 'checklists: reviewChecklists\('
      - path: src/lib/verbs/pullrequest/post.mts
        pattern: 'export function anchorsOf\b'
      - path: docs/reference/cli.md
        pattern: 'pullrequest post <url> --file <file> \[--dry-run\] \[--repo <path>\]'
    tests: true
    drive: true
  - n: 3
    files: [src/skills/reviewing/SKILL.md, src/skills/reviewing/steps/pr.md, src/skills/reviewing/checklists/crosscheck.md, src/agents/reviewer.md, src/rules/security-paths.md, test/repo/skills.test.mjs, test/repo/references.test.mjs, .claude/agent-memory/picket-reviewer/MEMORY.md, docs/reference/skills.md]
    greps:
      - path: src/skills/reviewing/SKILL.md
        pattern: '^when_to_use:'
      - path: src/skills/reviewing/SKILL.md
        pattern: '^argument-hint: "\[<pull request URL>\]"'
      - path: src/skills/reviewing/SKILL.md
        pattern: '^(?![\s\S]*(user-invocable|## Layout|## Load table|\| small \||Machine-enforced))'
        flags: i
      - path: src/skills/reviewing/SKILL.md
        pattern: 'AMENDMENT NEEDED'
      - path: src/skills/reviewing/SKILL.md
        pattern: 'steps/pr\.md'
      - path: src/skills/reviewing/steps/pr.md
        pattern: '^# Reviewing: pull request'
      - path: src/skills/reviewing/steps/pr.md
        pattern: '^(?![\s\S]*(sed -n|step:))'
        flags: i
      - path: src/skills/reviewing/checklists/crosscheck.md
        pattern: '`delta:'
      - path: .claude/agent-memory/picket-reviewer/MEMORY.md
        pattern: '^(?![\s\S]*literal-criterion)'
        flags: i
      - path: test/repo/skills.test.mjs
        pattern: '^(?![\s\S]*"reviewing")'
        flags: i
      - path: docs/reference/skills.md
        pattern: 'the kernel picks which checklists'
      - path: src/agents/reviewer.md
        pattern: '^(?![\s\S]*(Skip a finding the project|Never `APPROVED` past))'
        flags: i
      - path: src/agents/reviewer.md
        pattern: '`picket:reviewing`''s verdict rule'
      - path: src/rules/security-paths.md
        pattern: '`picket:reviewing`''s `patterns-security` checklist'
      - path: src/rules/security-paths.md
        pattern: '^(?![\s\S]*checklist 30)'
        flags: i
    tests: true
    drive: false
---
# Order: Reviewing skill front page and checklists

## Problem

The request implements `artifacts/refactor/14-reviewing.md` (draft, 2026-10-29); its Target and Decisions carry over as given. Checking them against trunk at `388c0af` adds five binding facts. `test/repo/references.test.mjs:129`, `:149` and `:153` name checklist files by their numbered names and read `reviewing/SKILL.md`'s own citations, so renames and the rewrite must move them. A cross-check send carries no `summary:` (`src/lib/shared/work/send.mts:104-109`), so that scope cannot "open the summary's checklists". `pullrequest prepare` returns a `Summary` with no `checklists` (`prepare.mts:41`; only `verbs/summary` attaches them), so removing the prose load table would leave pull request reviews with no list. `pullrequest post` knows neither the clone nor the head; the merge ref prepare fetched lives at `refs/harness/pr/<id>/merge` (`remote.mts:79`). And the draft's E1 wording "empty or comment-only" would itself trip the "or comment" ban.

## Decisions

### D-001 (r2): The kernel's map is the one load table, for every scope
**Decision:** `review-checklists.mts` holds the only copy of which checklist loads when. The 11 checklists lose their `NN-` prefix in the same phase as the map's constants and every test that names them. The prose load table and the Layout block leave `SKILL.md`. `pullrequest prepare` gains a top-level `checklists: reviewChecklists(summary, "phase")`, the same choice `rangeSummary` makes, so the pull request scope opens a kernel list too. The cross-check scope names `checklists/crosscheck.md` in its step, because no summary reaches it. A citation of a checklist by its old number outside the reviewing skill moves to the unnumbered name: `src/rules/security-paths.md:5` ("`picket:reviewing` checklist 30") becomes "`picket:reviewing`'s `patterns-security` checklist" in Phase 3, a bare name and not a path, since a rule may cite only the document kit.
**Instead of:** a `pr` value in `ChecklistScope`: it would select the same files as `phase` today and add a scope to every switch for no change in output.
**Risks:**
- **RISK-001** A review whose summary lacks `checklists` leaves the reviewer with the front page only. Mitigation: `summary/index.test.mts` and the prepare test pin `checklists` per scope.

### D-002: Seven rows pass on code evidence or a recorded decision, pinned by a repo test
**Decision:** T3, N2, A1, E1, Co1, Na2 and Uc2 take the fail conditions in Phase 1, severities unchanged. A new `test/repo/checklists.test.mjs` reads every table under a `| # | Check | Fail condition | Severity |` header in `src/skills/reviewing/checklists/` and fails when a Fail condition cell matches `/\b(no comment|or comment|documented)\b/i`, naming file and row id. E1 says "holds only a comment" instead of the draft's "comment-only", which the ban would catch. In scope `pr`, the code under review never followed Picket's comment rule, so a construct one of these rows flags that a person's comment justifies is reported as a Minor recommendation (replace the comment with the check or the decision), and Uc2 takes its "recorded decision" from the pull request description; that sentence lives in `SKILL.md`'s Rules (Phase 3).
**Instead of:** an exemption list in the test for rows allowed to mention comments: X1's "an empty body or a comment" already reads as a fail case, and a narrower regex keeps the test free of exceptions.
**Risks:**
- **RISK-002** Projects that passed these rows with a comment get new Major or Critical findings in phase and cumulative reviews. Mitigation: intended (draft 14, Risks); pull request reviews soften it to Minor.

### D-003: The dry run reads each anchor's code from the fetched merge ref
**Decision:** `remote.mts` gains `mergeRef(id)` (the local ref name `fetchPullRequest` already writes) and `resolveRepo(root, pr, repo)` (today's private `repoOf` in `prepare.mts`, moved). `post.mts` gains `--repo <path>`, `Anchor = { path: string; line: number; code: string | null }`, `anchorsOf(findings, read)` (pure: line `line` of the text `read(path)` returns, null when either is missing) and `anchorsAtHead(root, pr, repo, findings)` (wires `resolveRepo`, `mergeRef` and `gitRead(repo_root, ["show", "<ref>:<path>"])`; a clone or ref not found gives every anchor `code: null`). `Posted` gains `anchors: Anchor[]`, filled only on `--dry-run`. The dry-run render prints, under each `- path:line` thread line, the code trimmed and cut to `FIRST_LINE_CHARS`, indented four spaces, or `    (no line <n> at head)`. Nothing is fetched by `post`.
**Instead of:** passing `--head <sha>` from prepare's output: the lead would copy a SHA between two commands, the error the anchor check exists to remove.

### D-004 (r2): SKILL.md is the reviewer's front page; the pull request procedure is a step file
**Decision:** Frontmatter: `description` (what the skill does), `when_to_use` opening "Use when" with today's trigger phrases (`review this phase`, `review the diff`, `run an alignment check`, the cross-check, `/picket:reviewing <pull request URL>`), `argument-hint: "[<pull request URL>]"`, no `user-invocable`. Body: one purpose paragraph; `## Steps` as one ordered list: (1) invoked as `/picket:reviewing <url>`, you are the lead: read `steps/pr.md`, the rest is the reviewer's; (2) cross-check: `checklists/crosscheck.md` alone; (3) checkpoint: exactly the summary's `checklists`, honouring each `skip`; (4) cumulative: the same, in `traced.md`'s reading order; (5) pull request: exactly the `checklists` of the `pr:` JSON, the description as the plan. `## Rules`: the summary paragraph (kernel's numbers, never recomputed; a missing field is asked for; `changed_files` is the scope; `silenced` and `mutation` graded by `bar.md`; extension rows add findings and never waive a core row; a row whose construct is absent is skipped), severities with the out-of-range rule, the noise line, the evidence bar as the same five numbered items (`crosscheck.md` cites rules 2 and 3), the finding format, the verdict rule with the memory below, and D-002's pull request sentence. `## Output`: the block is the reviewer shell's `## Output`; the verdict stands alone on the last line. The memory `literal-criterion-misses-go-to-amendment` joins the verdict rule, every rule sentence of it: a criterion missed on the good side still fails, so no `APPROVED`; never ask for padded code; grade the row FAIL, name the `D-###` that states the bound, report `Decisions: DRIFT` and `AMENDMENT NEEDED: D-00x`, the fix being the amendment; group other literal misses (an over-broad grep, "same passing count") into that amendment as UNCLEAR; read each phase block's `Decisions:` line for self-reported misses; a plan grep hit on content the plan mandates is judged by intent, one on a name the developer chose is FAIL. Its `**Why:**` history (item 07a) is not carried. The file is then deleted. One copy of every fact: `src/agents/reviewer.md` drops the noise sentence that ends its `## Constraints` disprove paragraph ("Skip a finding the project's own gates already reject ...") and replaces the paragraph "Never `APPROVED` past a failed or unclear criterion, ..." with the one line "Verdicts follow `picket:reviewing`'s verdict rule." Every fact of that paragraph (failed or unclear criterion, failed `S` row, open Critical, `S` at UNCLEAR on `Questions:`, cross-check Critical or Major) is in the skill's verdict rule.
**Instead of:** keeping the pull request procedure in `SKILL.md` behind a heading: 2,032 bytes would still reach every reviewer spawn for a lead-only procedure.
**Risks:**
- **RISK-003** A rule sentence of the old page is lost in the cut. Mitigation: the reviewer diffs the old page and the memory against the new page sentence by sentence.

### D-005: The cross-check re-checks only the delta when the message carries one
**Decision:** `crosscheck.md`'s `## Scope` becomes: with a `delta:` line, read only those `### D-###` sections, the `## Revision log`, and the phases whose criteria cite those ids or that the amendment edited, and run the five checks over them; record `scope: delta (D-###, ...)`, cap 10 rows. Without one, a full pass, recorded `scope: full`, cap 30. The old "previous verdict was ALIGNED" condition goes, since item 13 sends `delta:` after a `DRIFT DETECTED`.
**Instead of:** a full pass after every drift, as today: it re-reads unchanged decisions and is the reason item 13's OQ-001 was left open.

## Scope

**In:**
- Checklist renames, the map and its tests, the seven rows and their repo test.
- `pullrequest prepare` checklists, `pullrequest post --dry-run` code at anchors, `--repo` on post, `cli.md` regenerated.
- `SKILL.md` front page, `steps/pr.md`, `crosscheck.md` delta, the reviewer memory moved and deleted, `docs/reference/skills.md`.

**Out:**
- `src/agents/reviewer.md` beyond the two passages of D-004 (r2).
- Checklist rows other than the seven, and posting on GitHub.

## Phase 1: Checklist names, the map, the seven rows

**Touch set:**
- `src/skills/reviewing/checklists/`: `git mv` all 11, `NN-` dropped
- `src/lib/shared/review-checklists.mts`: constants renamed
- `src/lib/shared/review-checklists.test.mts`: names follow
- `src/lib/verbs/summary/index.test.mts`: lines 66 and 67
- `src/skills/reviewing/SKILL.md`: names only, rewritten in Phase 3
- `test/repo/skills.test.mjs`: 11 `PENDING.names` entries leave
- `test/repo/references.test.mjs`: lines 129, 149, 153
- `test/repo/checklists.test.mjs`: new, D-002 ban

**Changes:**
1. `git mv` each checklist to the names in the frontmatter; update every citation inside them (`bar.md:3`, `traced.md:3, 13, 20`, `patterns-security.md:3`). `traced.md:3`'s "The load table in `SKILL.md` still applies for the pattern files" becomes "The summary's `checklists` list names the pattern files."
2. The seven fail conditions, verbatim:
   - T3: `` `!` with no earlier null check or narrowing in the same scope ``
   - N2: `` `!` is used with no preceding null check or pattern that rules out null ``
   - A1: `` A Promise-returning call has no `await`, `.then()` or `.catch()`, and no `void` prefix ``
   - E1: `` A `catch` body is empty, holds only a comment, or returns a value the return type cannot tell from success, with no logging or rethrow ``
   - Co1: `A function modifies a reference-type argument the caller passed in, and the parameter is not named as an output`
   - Na2: `A non-standard abbreviation is used as an identifier and is neither a convention established in the codebase nor a glossary term`
   - Uc2: `One use case writes two or more aggregate roots in one transaction and no decision in the record states why (eventual consistency is the default)`
3. `test/repo/checklists.test.mjs` per D-002, with a self-test: a fixture row "with no comment saying why" is flagged with its id, and the E1 text above is not.

**Done when:**
- **T-1.1** `src/skills/reviewing/checklists/` holds exactly the 11 unnumbered files, and `git grep -E "\b[1-6][0-9]-(alignment|bar|traced|patterns|design|framework|concern|crosscheck)" -- src/skills src/lib/shared src/lib/verbs test` prints nothing (`src/lib/util/yaml-lite-corpus.test.json` quotes old work items and stays).
- **T-1.2** `node --test src/lib/shared/review-checklists.test.mts` passes, including "every checklist the map names exists".
- **T-1.3** The seven rows read as in Changes 2, with their severities unchanged.
- **T-1.4** `node --test test/repo/checklists.test.mjs` passes, and its self-test fails the fixture row by id.
- **T-1.5** `node --test test/repo/skills.test.mjs test/repo/references.test.mjs` passes.
- **T-1.6** `npm test` passes.

## Phase 2: Pull request checklists and code at each anchor

**Touch set:**
- `src/lib/verbs/pullrequest/remote.mts`: `mergeRef`, `resolveRepo`
- `src/lib/verbs/pullrequest/prepare.mts`: uses both, adds `checklists`
- `src/lib/verbs/pullrequest/remote.test.mts`: fixture asserts both
- `src/lib/verbs/pullrequest/post.mts`: `--repo`, anchors, render
- `src/lib/verbs/pullrequest/post.test.mts`: parse, `anchorsOf`, render
- `docs/reference/cli.md`: regenerated by `npm run docs`
- `src/lib/verbs/pullrequest/threads.mts`: read only, `Finding`
- `src/lib/util/git.mts`: read only, `gitRead`

**Changes:** D-001's `checklists` on `Prepared` and D-003 in full. Post's usage becomes `pullrequest post <url> --file <file> [--dry-run] [--repo <path>]`.

**Done when:**
- **T-2.1** In the existing fixture of `remote.test.mts` (pull request 7, `src/b.ts` added), `preparePullRequest` returns `checklists` whose names are `alignment.md`, `bar.md`, `patterns-security.md`, `framework-typescript.md`, and `anchorsAtHead` for a finding at `src/b.ts:1` returns `code: "export const b = 2;"`.
- **T-2.2** `anchorsOf` with a reader holding `src/a.ts` as `"x\ny\n"` gives `code: "y"` for line 2 and `null` for line 9 and for `src/none.ts`.
- **T-2.3** `renderPosted` of a dry run prints the code line indented under its `- /src/a.ts:2` thread line, and `    (no line 9 at head)` under a missing one; a non-dry run prints the posted count as today.
- **T-2.4** `parse` of `--repo r` gives `repo: "r"`, and without it `repo: undefined`.
- **T-2.5** Driven through the built CLI in a scratch project that copies the fixture: `picket pullrequest prepare <url> --repo <clone> --human` then `picket pullrequest post <url> --file <review> --dry-run --repo <clone> --human`, with `AZDO_PAT` unset, prints `export const b = 2;` under the `src/b.ts:1` line.
- **T-2.6** `npm run docs` leaves `docs/reference/cli.md` with the new usage, and `npm test` passes.

## Phase 3: Front page, pull request step, cross-check delta

**Touch set:**
- `src/skills/reviewing/SKILL.md`: rewritten per D-004
- `src/skills/reviewing/steps/pr.md`: new
- `src/skills/reviewing/checklists/crosscheck.md`: `## Scope` per D-005
- `test/repo/skills.test.mjs`: `reviewing` leaves `UNCONVERTED_SKILLS`
- `test/repo/references.test.mjs`: line 129 targets `reviewing/steps/pr.md`
- `.claude/agent-memory/picket-reviewer/literal-criterion-misses-go-to-amendment.md`: deleted with `git rm`
- `.claude/agent-memory/picket-reviewer/MEMORY.md`: its index line leaves
- `docs/reference/skills.md`: `## picket:reviewing` section
- `src/agents/reviewer.md`: lines 37 and 41 per D-004 (r2)
- `src/rules/security-paths.md`: line 5 per D-001 (r2)
- `test/repo/description-cases.json`: read only, routing prompts
- `test/repo/agents.test.mjs`: read only, shell checks

**Changes:**
1. `SKILL.md` per D-004.
2. `steps/pr.md`, `# Reviewing: pull request`, one ordered list carrying today's four steps with three changes: the spawn message is `scope: pr` and `pr: <the JSON, verbatim>` with no `step:` line; the manual `git show | sed` line check goes; step 4 says the dry run prints the code under each anchor, passes `--repo` when prepare needed it, and a code line that does not match its finding is named to the user before `[y] post`.
3. `crosscheck.md` per D-005.
4. `src/agents/reviewer.md`: the two passages of D-004 (r2).
5. `src/rules/security-paths.md:5`: the parenthesis becomes "(`picket:reviewing`'s `patterns-security` checklist)"; the rest of the line stays.
6. `docs/reference/skills.md`: the section's first sentence becomes "The reviewer's grading rules: severities, the evidence bar, the finding format and when a verdict may say `APPROVED`; the kernel picks which checklists it opens."

**Done when:**
- **T-3.1** `SKILL.md` is at most 7,000 bytes and its `##` headings are exactly `Steps`, `Rules`, `Output`.
- **T-3.2** Every rule sentence of the old page outside the load table, Layout and pull request mode, and every rule sentence of the memory listed in D-004, has its fact in the new page; the evidence bar is five numbered items in the old order.
- **T-3.3** `steps/pr.md` is at most 80 lines and passes the header and list checks of `skills.test.mjs`.
- **T-3.4** `crosscheck.md` says a `delta:` line limits the pass to those decisions, the revision log and the phases citing or edited for them, and that no `delta:` means a full pass.
- **T-3.5** `literal-criterion-misses-go-to-amendment.md` no longer exists and `MEMORY.md` has no line for it.
- **T-3.6** `src/agents/reviewer.md` has no "Skip a finding the project's own gates" and no "Never `APPROVED` past", carries the line "Verdicts follow `picket:reviewing`'s verdict rule.", and every fact of the removed paragraph is in `SKILL.md`'s verdict rule.
- **T-3.7** `src/rules/security-paths.md` names the checklist as "`picket:reviewing`'s `patterns-security` checklist", and `git grep -n "checklist 30" -- src docs` prints nothing.
- **T-3.8** `node --test test/repo/skills.test.mjs test/repo/references.test.mjs test/repo/descriptions.test.mjs test/repo/docs.test.mjs test/repo/agents.test.mjs` passes, then `npm test`.

## Open questions

- **OQ-001** [answered 2026-10-29] Does `src/agents/reviewer.md` keep its noise sentence and "Never `APPROVED` past..." paragraph? Owner: user. Answer: no, one copy of every fact; D-004 (r2) drops both in Phase 3 and leaves one line citing the skill's verdict rule.

## Revision log

- 2026-10-29: D-004 (r2): reviewer.md drops its noise sentence and verdict paragraph, keeps one citing line; OQ-001 answered by the user.
- 2026-10-29: D-001 (r2): security-paths.md:5 still said "checklist 30" after phase 1's renames; phase 3 names `patterns-security`.
