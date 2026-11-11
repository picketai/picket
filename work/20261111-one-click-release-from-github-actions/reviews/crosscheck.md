## Review: 20261111-one-click-release-from-github-actions · crosscheck

The decisions and phases agree: every `D-###` has a phase criterion and every phase implements a decision, with three Minor gaps in wording and coverage. I read no code, as the checklist requires.

Alignment: PASS (all six decisions map to T-criteria; phase 2 `security: true` matches D-004 and D-005)
Decisions: HONOURED
Findings: clean, 0 critical, 0 major, 3 minor
- [Minor] work/20261111-one-click-release-from-github-actions/design.md#phase-2: Reference integrity. "the D-006 test of the earlier item" collides with this record's own `D-006` (inputs through `env`). The test it means is the one named "(D-006)" at `test/repo/release.test.mjs:57`, from a previous work item. Name it by its title: "the release workflow tests on Node 24 ...".
- [Minor] work/20261111-one-click-release-from-github-actions/design.md#D-002: Decision coverage. The mode rules have no criterion of their own: `version` skipped when `retag_latest` is set, `retag` skipped otherwise, `retag_latest` wins over `dry_run`, and the dry run ends in `--dry-run`. Only the input declarations (T-2.3) and the job order (T-2.1) are pinned. Add to T-2.3 or T-2.4 an assertion on the `if:` of `version`, `retag` and the two publish steps.
- [Minor] work/20261111-one-click-release-from-github-actions/design.md#D-004: Decision coverage. D-004 mandates refusing a release unless `GITHUB_REF` is `refs/heads/trunk`, but T-2.4 and T-2.6 never exercise that refusal. T-2.6 only covers the version-mismatch refusal. Add a T-2.6 case with `GITHUB_REF=refs/heads/other` that exits non-zero and leaves `origin` unchanged.

Checked: the T-1.x and T-2.x greps against `release.yml`, `release.mjs` and the existing tests (`release.test.mjs:57`, `:81`); the phase 3 `in four jobs` absent-grep against `CONTRIBUTING.md:45`; the facts cited in `## Problem` (`package.json:3` and `:38`, `release.yml:3-6`, `:107-137`).

ALIGNED
