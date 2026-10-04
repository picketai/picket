---
kind: design
lane: design
title: Tidy repository before Tether packaging
date: 2026-10-04
audience: developer
sources: [request, .claude/MEMORY.md, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, package.json, README.md, .claude/output-styles/custom.md, .claude/hooks/README.md, .claude/hooks/guard.block.mjs, .claude/hooks/lib/turn-block.mjs, .claude/lib/admit.mjs, .claude/lib/repos.mjs, .claude/lib/verify.mjs, test/kernel/admit.test.mjs, test/kernel/review.test.mjs, test/budgets.test.mjs, .claude/rules/work-items.md, .claude/rules/harness-authoring.md, .gitignore, bench/tasks/, work/20261004-tether-plugin-spike-eleven-packaging-checks/request.md, work/20261004-research-closing-block-gets-its-own-heading/request.md]
phases:
  - n: 1
    files: [test/kernel/review.test.mjs, package.json]
    greps:
      - path: test/kernel/review.test.mjs
        pattern: "assert\\.deepEqual\\(nestedRepos\\(here\\), \\[\\]\\)"
      - path: package.json
        pattern: "\"test\": \"node --test"
    tests: true
    drive: false
  - n: 2
    files: [.claude/lib/admit.mjs, test/kernel/admit.test.mjs]
    greps:
      - path: .claude/lib/admit.mjs
        pattern: "const DECLARED_RESEARCH = "
      - path: .claude/lib/admit.mjs
        pattern: "const NOT_A_CREDENTIAL = "
      - path: .claude/lib/admit.mjs
        pattern: "declared_research:"
      - path: test/kernel/admit.test.mjs
        pattern: "a research work item"
      - path: test/kernel/admit.test.mjs
        pattern: "bearer token"
    tests: true
    drive: true
  - n: 3
    files: [test/markdown-paths.test.mjs, .claude/output-styles/custom.md, .claude/agents/reviewer.md, .claude/skills/designing/SKILL.md, .claude/skills/reviewing/steps/10-alignment.md, .claude/skills/reviewing/steps/60-crosscheck.md, .claude/skills/reviewing/templates/alignment.md, .claude/skills/reviewing/templates/cross-check.md, .claude/skills/reviewing/templates/patterns.md, PLAN.md, README.md]
    greps:
      - path: test/markdown-paths.test.mjs
        pattern: "ELSEWHERE"
      - path: test/markdown-paths.test.mjs
        pattern: "--exclude-standard"
      - path: README.md
        pattern: "ten hooks"
      - path: .claude/agents/reviewer.md
        pattern: "\\.claude/skills/reviewing/steps/15-traced\\.md"
      - path: .claude/skills/designing/SKILL.md
        pattern: "\\.claude/skills/ordering/steps/40-review\\.md"
      - path: .claude/skills/reviewing/steps/10-alignment.md
        pattern: "\\.claude/agents/developer\\.md"
    tests: true
    drive: false
  - n: 4
    files: [CONTRIBUTING.md, .claude/rules/harness-authoring.md]
    greps:
      - path: CONTRIBUTING.md
        pattern: "^## Commits"
      - path: CONTRIBUTING.md
        pattern: "^## Markdown"
      - path: .claude/rules/harness-authoring.md
        pattern: "CONTRIBUTING\\.md"
    tests: true
    drive: false
---
# Design: Tidy repository before Tether packaging

## Problem

Step 1 of the Tether packaging plan asks for a clean baseline before step 2 ("Separate") moves state to `.tether/state/` and splits the core out. Today `npm test` fails in any fresh worktree because `test/kernel/review.test.mjs:96` asserts that the gitignored `.claude/branching/manifest.yaml` exists (`.gitignore:33`); `package.json` names a missing `index.js` and three scripts whose targets (`scripts/lint-agents.mjs`, `.claude/hooks/lint.contract.mjs`, `.claude/hooks/lint.write.mjs`) do not exist; `.claude/output-styles/custom.md` describes `inject.prose.mjs` and an em dash protocol that no hook has (`guard.block.mjs:9` and `turn-block.mjs:142` match plain headings); `README.md` says nine hooks and lists four rules where `.claude/hooks/` has ten and `.claude/rules/` five. Admission misroutes in two ways: `RESEARCH` at `admit.mjs:18` has no term for a request that calls itself research, and even with one, `SMALL_CHANGE` fires on "bump" in the 2026-10-04 spike request; `SECURITY` at `admit.mjs:19` fires on any bare "token", so "verdict token" sent a heading rename to the design lane. Binding: the product name is Tether in anything a user reads (`.claude/MEMORY.md`), no new code comments (`.claude/rules/comments.md`), the budgets in `test/budgets.test.mjs`, and nothing from step 2 (paths module, `.tether/`, hook shells, repo-only `harness-authoring`).

## Decisions

### D-001: The nested-repos test asserts behaviour, not a machine-local file
**Decision:** Infrastructural decision. The test "this repository has no nested repos ... (T-1.6)" keeps only `assert.deepEqual(nestedRepos(here), [])`. That holds with the manifest (its only entry is `path: .`, which `fromManifest` drops at `repos.mjs:30`) and without it (no `src/`, so the scan returns `[]`), so the test passes in every worktree. The manifest-parsing behaviour stays covered by the temp-repo test at `review.test.mjs:86`.
**Instead of:** committing a `.claude/branching/manifest.yaml`: the file is machine-local by design (`.gitignore:31` to `:33`), and step 2 moves such files anyway.
**Risks:**
- **RISK-001** A future nested repo under `src/` in this repository would fail the test. Mitigation: that is the test's purpose; the failure message names the repo.

### D-002: `package.json` loses dead entries and gains nothing
**Decision:** Infrastructural decision. Remove `main` and the scripts `lint:agents`, `lint:contract`, `lint:memory`. Their jobs now live in `lint.schema.mjs` and `test/budgets.test.mjs`. Every other key stays, including `opensrc` and `type`.
**Instead of:** recreating the three lint scripts: their checks are already done elsewhere, so a rebuild would make a second copy of each fact.
**Risks:**
- **RISK-002** A person or bench adapter runs `npm run lint:agents`. Mitigation: `git grep` finds no caller outside `package.json` (checked 2026-10-04); npm prints "missing script", which is loud.

### D-003: A request that names itself a research work item goes to the research lane
**Decision:** Infrastructural decision. A new pattern `DECLARED_RESEARCH = /\b(an?|this) research (work )?item\b/i` sets the research signal on its own, ahead of `SMALL_CHANGE`; `NEW_SURFACE` still vetoes it. `signals.research` becomes `(DECLARED_RESEARCH || (RESEARCH && !SMALL_CHANGE)) && !NEW_SURFACE`, and `signals` gains `declared_research: boolean`. The research lane writes no production code, so landing there never lowers the scrutiny on a code change.
**Instead of:** adding the bare word `research` to `RESEARCH`: the spike request also says "version bump", so `SMALL_CHANGE` would still veto it, and "Change how the research lane numbers findings" would be admitted as research.
**Risks:**
- **RISK-003** A sentence such as "this is not a research work item" matches. Mitigation: the analyst's outline gate stops the run before any report; `lane: order` in the text forces the lane.

### D-004: Security admission subtracts known non-credential "token" phrases and keeps every other "token"
**Decision:** Infrastructural decision on a security-relevant path. `touchesSecurity` tests `SECURITY` against the text with `NOT_A_CREDENTIAL` phrases removed: `verdict tokens?`, `tokens? (budget|count|usage|cost|limit|window)s?`, `(input|output|cache|cached|prompt|context) tokens?`. Any other "token" (bare, "the token", "refresh token", "bearer token") still sets `security: true`. The security-path prefix check keeps using the original text. This fails closed: an unknown phrase stays in the design lane.
**Instead of:** an allowlist of credential qualifiers (`access|refresh|bearer|api|session|jwt token`): "Expire the token after 15 minutes" would then leave the design lane, which is the direction this record must not open.
**Risks:**
- **RISK-004** A credential change worded only with a subtracted phrase ("rotate the cache token") drops a lane. Mitigation: the list holds only harness and model-usage senses; a test pins that a mixed request ("verdict token" plus "bearer token") stays in design.

### D-005: What the Markdown path test counts as a path, and where it looks
**Decision:** Infrastructural decision. A candidate is an inline backtick span outside fenced blocks, with no whitespace and none of `< > * { } [ ] $ ~ | " ' = ( ) ,` or `…`, not starting with `/`, `../`, a drive letter or a URL scheme, that contains `/` and ends with `/` or a file extension, after a trailing `:line` or `#anchor` is cut. So `.claude/lib/admit.mjs:18` checks `.claude/lib/admit.mjs`, while `work/<id>/`, `work/**`, `tok/line`, `src/Rent` and `SKILL.md` are skipped. It resolves against the Markdown file's directory, then each ancestor up to the root. It exists when `git ls-files --cached --others --exclude-standard` lists it, or a file under it, and it is on disk. Gitignored files never count, so a local `.claude/ledger/` cannot hide a miss and the result matches a fresh worktree.
**Instead of:** `existsSync` alone: it passes locally on gitignored files and fails in a fresh worktree, the bug class of item 6.
**Risks:**
- **RISK-005** An extensionless path without a trailing slash (`bench/fixture`) is never checked. Mitigation: accepted as a cost; the common forms are covered, and the rule is written in `CONTRIBUTING.md`.

### D-006: Scanned files and an explicit list of paths that live elsewhere
**Decision:** Infrastructural decision. The scan covers listed `*.md` except under `work/`, `spike/`, `tmp/`, `artifacts/reports/`, `bench/results/` and `.claude/skills/*/examples/`: dated records, throwaway, scratch, generated reports, and example tickets from other projects. Legitimately absent paths go in one data structure in the test, `ELSEWHERE: Array<{ why: string, paths: string[] }>`, grouped as run-time or machine-local, relative to a work item or remote, host-project layout, inside a bench run repo, and planned by SDR-00001. The test also fails when an `ELSEWHERE` path is no longer cited or now exists, so the list cannot rot.
**Instead of:** reading `.gitignore` through `git check-ignore`: with `--no-index` it reported `.claude/`, `work/` and `bench/` as ignored on this machine (2026-10-04), so it would skip real paths.
**Risks:**
- **RISK-006** Each new example path costs one list entry. Mitigation: the failure names file and path, and `CONTRIBUTING.md` says where to add it.

### D-007: A stale reference is repointed to its current home, else its clause goes
**Decision:** Infrastructural decision. Each miss the scan finds is repointed when the fact now lives elsewhere (for example `.claude/agents/assets/detectors.yaml#test_authoring_policy` becomes `.claude/agents/developer.md`, whose `## Constraints` holds the test policy at line 28), and deleted when nothing replaces it. In `custom.md`, the paragraph on `inject.prose.mjs`, both `shared` markers and the protocol-dash exemption go: nothing reads the markers (repo-wide search, 2026-10-04), and no contract heading carries a dash. `README.md` counts ten hooks and lists five rules.
**Instead of:** rewriting `custom.md` to drop rules 1 to 3, which duplicate `prose.md`: that is TF-002's call on how rules reach agents, step 2 scope.
**Risks:**
- **RISK-007** A repointed reference changes what a reviewer reads. Mitigation: each target was read and holds the same fact; the list is in Phase 3.

### D-008: Repository conventions live in `CONTRIBUTING.md`
**Decision:** Infrastructural decision. A root `CONTRIBUTING.md` holds layout placement, code, test, Markdown, commit and throwaway-folder conventions, each verified against the tree and `git log`. It points at `README.md`, `.claude/rules/` and `test/budgets.test.mjs` for facts they already hold and copies none of them. `.claude/rules/harness-authoring.md` gains one line pointing at it.
**Instead of:** extending `harness-authoring.md`: it loads only for `.claude/**` while the conventions cover `test/`, `bench/` and commits, and SDR-00001 D-003 makes it repo-only, so humans would not find it.
**Risks:**
- **RISK-008** The document drifts from the tree. Mitigation: its paths are checked by the Phase 3 test; it states rules, not counts.

## Scope

**In:**
- Requests 1 to 8: `package.json`, the nested-repos test, admission patterns, stale references and README counts, the Markdown path test, `CONTRIBUTING.md`.
- Every stale backticked path the D-005 scan finds in the scanned Markdown.

**Out:**
- Step 2: the paths module, `.tether/`, `.tether/config.json`, hooks as shells, repo-only `harness-authoring`, the `tether:` rename.
- Renaming `README.md`, `package.json` or the repository to Tether: settled at the alpha (`.claude/MEMORY.md`).
- `.gitignore` stale comments and the dead `.claude/telemetry/` and `.claude/state/` entries (OQ-001).
- Comments in code naming missing files (`.claude/rules/comments.md`: leave existing comments).
- Markdown under `work/`, `spike/`, `tmp/`, `artifacts/reports/`, `bench/results/`.

## Phase 1: Green baseline

**Touch set:**
- `test/kernel/review.test.mjs`: drop machine-local manifest assertions
- `package.json`: remove `main` and three dead scripts

**Changes:** In the test at `review.test.mjs:94`, delete the two assertions on `.claude/branching/manifest.yaml` (lines 96 and 97); keep `nestedRepos(here)` deep-equal to `[]` and the title. Remove any import the deletion leaves unused. In `package.json`, delete the `main` key and the `lint:agents`, `lint:contract` and `lint:memory` scripts; leave every other key and value as it is.

**Done when:**
- **T-1.1** `npm test` exits 0 in this worktree, where `.claude/branching/` does not exist.
- **T-1.2** With a temporary `.claude/branching/manifest.yaml` whose only repo is `path: .`, `node --test test/kernel/review.test.mjs` passes; the temporary file is deleted afterwards.
- **T-1.3** No line of `test/kernel/review.test.mjs` names `manifest.yaml` outside the temp-repo test at line 86.
- **T-1.4** `package.json` has no `main` key and no `lint:agents`, `lint:contract` or `lint:memory` script.
- **T-1.5** Every `node <path>` in `package.json` scripts names a file that exists: `.claude/bin/harness.mjs`, `bench/run.mjs`, `bench/report.mjs`.

## Phase 2: Admission reads declared research and credential tokens

Security-relevant (D-004): this phase never shares a run grant.

**Touch set:**
- `.claude/lib/admit.mjs`: two patterns, one signal, `touchesSecurity`
- `test/kernel/admit.test.mjs`: evidence and fail-closed cases

**Changes:** In `admit.mjs`, add `DECLARED_RESEARCH` and `NOT_A_CREDENTIAL` beside the existing patterns (lines 18 to 26), with the exact alternations in D-003 and D-004. `signals` gains `declared_research: DECLARED_RESEARCH.test(text)`, and `signals.research` becomes `(declared_research || (RESEARCH && !SMALL_CHANGE)) && !NEW_SURFACE`. `touchesSecurity(paths, text, securityPaths)` keeps its signature; only its `SECURITY` test reads the text with `NOT_A_CREDENTIAL` matches replaced by a space. `NOT_A_CREDENTIAL` carries the `g` flag and is used only through `replace`, so no `lastIndex` state leaks. The lane order in `admit()` and `recheck()` is unchanged. No grep of `bench/tasks/` matches "token" or "research work item" (checked 2026-10-04), so no golden task changes lane. In `admit.test.mjs`, add one test per criterion below, using the existing `repo()` fixture.

**Done when:**
- **T-2.1** "Tether plugin spike: a research work item whose throwaway code lives only under `spike/`. Question: can a Claude Code plugin carry Tether? Check that a version bump arrives with one update command." admits to `research` with `signals.declared_research` true.
- **T-2.2** "This is a research work item: add an endpoint GET /invoices/:id/summary." admits to `order`.
- **T-2.3** The request in `work/20261004-research-closing-block-gets-its-own-heading/request.md` without its leading `lane: fast.` admits to `fast` with `signals.security` false.
- **T-2.4** "Expire the token after 15 minutes of inactivity.", "Rotate the refresh token on every login." and "Name the verdict token in the docs and validate the bearer token in the middleware." each admit to `design` with `signals.security` true.
- **T-2.5** "Show the token count per agent in the cost table." admits with `signals.security` false.
- **T-2.6** Every pre-existing test in `test/kernel/admit.test.mjs` passes unchanged, including the API-key request in `design`.
- **T-2.7** `node .claude/bin/harness.mjs admit --text "<the T-2.1 text>"` run in this repository answers lane `research`.

## Phase 3: Markdown path test and stale references

**Touch set:**
- `test/markdown-paths.test.mjs`: new repo-wide test
- `.claude/output-styles/custom.md`: drop `inject.prose.mjs` text, markers
- `.claude/agents/reviewer.md`: repoint `steps/15-traced.md`
- `.claude/skills/designing/SKILL.md`: repoint `steps/40-review.md`
- `.claude/skills/reviewing/steps/10-alignment.md`: repoint `detectors.yaml`
- `.claude/skills/reviewing/templates/patterns.md`: repoint `detectors.yaml`
- `.claude/skills/reviewing/steps/60-crosscheck.md`: repoint glossary, example record
- `.claude/skills/reviewing/templates/cross-check.md`: repoint glossary, record, block spec
- `.claude/skills/reviewing/templates/alignment.md`: repoint `templates/plan.md`
- `PLAN.md`: `steps/step-NN.md` placeholder
- `README.md`: hook count, rules list

**Changes:** `test/markdown-paths.test.mjs` sits beside `test/budgets.test.mjs` and uses `resolve(".")` as root like it. It holds the D-005 candidate rule and resolution, the D-006 exclusions, and `ELSEWHERE`. Three tests: the candidate rule against fixed strings; every candidate resolves or is in `ELSEWHERE`, failing with one `file: path` line per miss; every `ELSEWHERE` path is cited by some scanned file and is absent from the listing. `ELSEWHERE` starts as these groups:
- run time or machine-local: `.claude/PROJECT-MAP.md`, `.claude/agent-memory/analyst/MEMORY.md`, `.claude/branching/manifest.yaml`, `.claude/ledger/`, `.claude/ledger/drive-log.jsonl`, `.claude/ledger/ledger.jsonl`, `.claude/settings.local.json`, `.opensrc/`, `.worktrees/`, `artifacts/api/`, `bench/.runs/`, `bench/results/spend.log`
- relative to a work item or a remote: `phases/`, `origin/`
- host-project layout: `API/`, `Application/`, `Common/`, `Domain/`, `Features/`, `Infrastructure/`, `Presentation/`, `Shared/`, `docs/`, `src/`, `src/auth.ts`, `.azuredevops/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- inside a bench run repo: `data/invoices.json`, `test/hidden/`
- planned by SDR-00001: `.tether/`, `.tether/config.json`, `.tether/state/`, `core/`, `rules/`

Stale references, repointed or removed per D-007 (each target read on 2026-10-04):
- `custom.md`: delete lines 13 to 17, the `shared:begin` and `shared:end` marker lines, and the protocol-dash sentence at line 148; "Four exemptions" becomes "Three exemptions".
- `reviewer.md:23`: `steps/15-traced.md` becomes `.claude/skills/reviewing/steps/15-traced.md`.
- `designing/SKILL.md:16`: `steps/40-review.md` of ordering becomes `.claude/skills/ordering/steps/40-review.md`.
- `10-alignment.md:51`, `patterns.md:70`: `.claude/agents/assets/detectors.yaml#test_authoring_policy` becomes `.claude/agents/developer.md`.
- `60-crosscheck.md:15`, `cross-check.md:40`: `artifacts/strategy/glossary/` becomes `.claude/MEMORY.md` (its `## Language`).
- `60-crosscheck.md:31`: the example anchor becomes `work/<id>/design.md#D-003`.
- `alignment.md:13`: `templates/plan.md` becomes `.claude/rules/work-items.md` (its caps line).
- `cross-check.md:5`: `templates/design-record.md` becomes `.claude/skills/documenting/templates/design.md`.
- `cross-check.md:94`: both `agents/assets/...` references become `.claude/skills/reviewing/steps/60-crosscheck.md` (`## Findings and verdict`).
- `PLAN.md:117`: `steps/step-NN.md` becomes `steps/NN-<name>.md`.
- `README.md` layout: "ten hooks", the kinds list gains state injection, the rules list gains `comments`.

**Done when:**
- **T-3.1** `node --test test/markdown-paths.test.mjs` passes and `npm test` exits 0.
- **T-3.2** The candidate test pins `.claude/lib/admit.mjs:18` to `.claude/lib/admit.mjs` and `.claude/rules/` as candidates, and `work/<id>/`, `work/**`, `tok/line`, `src/Rent`, `SKILL.md`, `https://x.y/a.md` as not.
- **T-3.3** Adding `` `.claude/hooks/inject.prose.mjs` `` to `README.md` fails the test with a line naming `README.md` and that path; the edit is reverted.
- **T-3.4** Adding an uncited path to `ELSEWHERE` fails the test naming that path; the edit is reverted.
- **T-3.5** `git grep -n -e inject.prose -e shared:begin -e shared:end -- .claude` prints nothing.
- **T-3.6** `README.md` says "ten hooks" and its rules line names `comments`.

## Phase 4: Repository conventions

**Touch set:**
- `CONTRIBUTING.md`: new, root
- `.claude/rules/harness-authoring.md`: one pointer line

**Changes:** `CONTRIBUTING.md`, at most 80 lines, titled for Tether, with headings in this order: `## Layout`, `## Code`, `## Tests`, `## Markdown`, `## Commits`, `## Folders outside the product`. Layout points at the `README.md` `## Layout` map and says where new things go: kernel modules in `.claude/lib/` with `test/kernel/<module>.test.mjs`; hooks as `.claude/hooks/<kind>.<name>.mjs`, wired in `.claude/settings.json` and tested in `test/hooks/hooks.test.mjs`. Code: Node ESM `.mjs`, only `node:` built-ins under `.claude/lib/` and `.claude/hooks/` (shell-quote is vendored at `.claude/hooks/vendor/shell-quote-parse.mjs`), comments per `.claude/rules/comments.md`. Tests: `node:test` with `node:assert/strict`; `npm test` runs `test/` and `bench/test/`; repo-wide checks sit at `test/` root; a test never depends on a gitignored file. Markdown: prose per `.claude/rules/prose.md`; the D-005 rule in one paragraph and how to add an `ELSEWHERE` entry. Commits: `type(scope): summary`, the types and scopes `git log` shows, `chore(work): close <id>` after a work item closes, and agents never commit (`.claude/rules/work-items.md`). Folders: `spike/` is deleted before the alpha, `tmp/` is scratch, `work/` and `artifacts/reports/` are dated records whose paths are not checked. Naming: Tether in text a user reads, "harness" only internally (`.claude/MEMORY.md`). In `harness-authoring.md`, add one line pointing at `CONTRIBUTING.md` for layout, tests, commits and folders.

**Done when:**
- **T-4.1** `CONTRIBUTING.md` exists with the six headings in the order above.
- **T-4.2** `npm test` exits 0 with `CONTRIBUTING.md` scanned, and `ELSEWHERE` gained no entry in this phase.
- **T-4.3** `.claude/rules/harness-authoring.md` has a line naming `CONTRIBUTING.md` and the budget test passes.
- **T-4.4** `CONTRIBUTING.md` contains no em dash or en dash.
- **T-4.5** Every commit type and scope `CONTRIBUTING.md` names occurs in `git log --format=%s -60`.
- **T-4.6** `CONTRIBUTING.md` contains none of `2048`, `120 lines`, `150 lines`, `80 lines` or `60 lines`, and names `test/budgets.test.mjs`.

## Open questions

- **OQ-001** Should the stale `.gitignore` comments at lines 13, 15 and 17 (they name `hooks/emit.metrics.mjs`, `telemetry/report.mjs`, `hooks/observe.bash.mjs`, `guard.verdict.mjs`) and the dead `.claude/telemetry/` and `.claude/state/` entries go now? `.claude/hooks/lib/drive-evidence.mjs:110` still excludes both folders, and step 2 moves state. Owner: user. Fallback: leave them for step 2.

## Revision log
