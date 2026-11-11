## Review: 20261111-one-click-release-from-github-actions · cumulative

Approved: every request sentence and every T-criterion has code or test evidence, and the only defect is one Minor in the CONTRIBUTING.md failure advice.

Requirements: PASS (13)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "a manual run (workflow_dispatch, no input needed) does the whole release in one run" | request.md:1 | PASS | .github/workflows/release.yml:41-46 (mode=release on trunk with no input) |
| S-2 | "a new version job (contents: write) checks out trunk" | request.md:1 | PASS | release.yml:26-30, :57-61; test T-2.2 at test/repo/release.test.mjs:94 |
| S-3 | "refuses unless CHANGELOG.md's newest heading ends "(not released yet)"" | request.md:1 | PASS | .github/scripts/release.mjs:35-40; release.yml:82; drive: `changelog-check` here exits 1 naming "## 1.0.0-alpha.6", tree clean |
| S-4 | "renames that heading to the bare version, commits it" | request.md:1 | PASS | release.mjs:42-47; release.yml:83-85; test T-1.2 at release.test.mjs:205 |
| S-5 | "runs npm version prerelease --preid alpha (whose existing hook syncs src/.claude-plugin/plugin.json)" | request.md:1 | PASS | release.yml:86; package.json:38; 2.block.md drive (plugin.json at 1.0.0-alpha.7) |
| S-6 | "pushes the commit and the v tag" | request.md:1 | PASS | release.yml:100 |
| S-7 | "then test, build-on-22 and mods run on that tag's commit" | request.md:1 | PASS | release.yml:105, :140, :168 plus checkout `ref: needs.version.outputs.ref`; test T-2.1 at release.test.mjs:82 |
| S-8 | "publish publishes it under the alpha dist-tag" | request.md:1 | PASS | release.yml:215-217 (REF = the pushed tag), :234; distTag at release.mjs:18 |
| S-9 | "Everything stays in release.yml" | request.md:1 | PASS | no other workflow changed (diff stat) |
| S-10 | "A pushed v tag still releases as today." | request.md:1 | PASS | release.yml:39-40 (tag mode: ref=GITHUB_SHA, tag=GITHUB_REF_NAME, no checkout); T-5.5 test at release.test.mjs:144 unchanged |
| S-11 | "After every publish, the publish job also runs npm dist-tag add @picketai/picket@<version> latest" | request.md:1 | PASS | release.yml:236-242; test T-2.4 at release.test.mjs:115 |
| S-12 | "an optional workflow_dispatch input retag_latest: <version> that, when set, only moves latest" | request.md:1 | PASS | release.yml:12-16, :27, :250-272 |
| S-13 | "The changelog check and rename live in .github/scripts/release.mjs as verbs with unit tests. Update the release section of CONTRIBUTING.md." (dry run "may be replaced by an input") | request.md:1 | PASS | release.mjs:99-102; release.test.mjs:195-240; CONTRIBUTING.md:146-162; dry_run at release.yml:8 |

Alignment: PASS (T-1.1 to T-1.6, T-2.1 to T-2.6, T-3.1 to T-3.4: 16 PASS; T-2.7, T-2.8 DEFERRED to the product owner at the first retag run and the first one-click release)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] CONTRIBUTING.md:152: "A job that fails after the push leaves a tag with nothing published. Finish it with "Re-run failed jobs"" is wrong when `publish` fails at "Move latest" (release.yml:236). That is the OQ-001 case: the version is already published, and a re-run stops at `npm publish` because npm refuses the same version twice. Add that a failure at "Move latest" is finished with a `retag_latest` run (or a local `npm dist-tag add`), not a re-run.
Classes: none
Checked: `node --test test/repo/release.test.mjs` passes 21 of 21. The T-1.5 drive gives exit 1 and a clean CHANGELOG.md. `inputs.*` is null on a tag push, so `version` runs and `retag` is skipped. In retag mode the skipped `version` skips every dependent job. A dry-run `tag` of '' gives the old dispatch path (`REF` ''). Under `bash -e`, a failing `$(changelog-check)` stops the step. No unknown-verb message consumer exists outside release.mjs. Comments: none added. silenced is empty, and the mutation (release.mjs:44 `!==` to `===`) was killed. The dry run's write token with repo code is no escalation, because workflow_dispatch already runs the branch's own release.yml.

APPROVED
