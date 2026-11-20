## Review: 20261120-docs-site-with-zensical-on-pages · crosscheck

The decisions and phases agree: every D-### has a criterion, every phase implements a decision, and no reference is broken. Scope: full.

Alignment: PASS (D-001 to D-007 against T-1.1 to T-3.7)
Decisions: HONOURED
Findings: clean
Checked:
- **Decision coverage:**
  - D-001 is covered by T-2.3, T-2.4 and T-2.6.
  - D-002, D-003 and D-004 are covered by T-2.2 and the `zensical.toml` and logo greps.
  - D-005 is covered by T-1.1 and T-1.2.
  - D-006 is covered by T-1.4.
  - D-007 is covered by T-3.1 to T-3.6, with T-3.7 deferred to the owner.
- **Reverse coverage:** every phase implements at least one decision.
- **Phase 1 numbers:**
  - The base has 15 files under `docs/design`.
  - `design/README.md` had three `docs/design` lines (14, 16, 22), which matches the T-1.5 count.
  - `docs/how-to.md:374` links `../CHANGELOG.md`, as D-006 says.
- **Pin style:** the checkout SHA in the Phase 3 table matches `release.yml`, and `release.yml` has the workflow-level `contents: read` that T-3.4 copies. I did not re-read the other four action tags from the remote.
- **Id sequences:** D-001 to D-007, RISK-001 to RISK-006 and OQ-001 to OQ-002 have no gaps.
- **Caps:** 7 decisions, and 6, 7 and 7 criteria per phase.
- **Strategy:** SDR 00005 requires a live confirmation for irreversible actions. D-007 leaves enabling Pages and the first push to the user, so it does not contradict the SDR.
- **Reports and charters:** none are cited.
- **Not run:** I did not check terminology against `.claude/MEMORY.md`.

Phase 1's move was already in the working tree during this pass, even though state shows no `phases/1.done` marker. I read only the design record.

ALIGNED
