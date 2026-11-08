## Review: 20261107-plugin-only-install · cumulative

APPROVED: every requirement and criterion I could check has code and a passing test or drive behind it, and the only red tests are the 25 status pane and band tests that OQ-008 and T-7.4 exempt.

Requirements: PASS (13), UNCLEAR: S-5, S-7 (2 rows left out: section 3 "no change" and section 7 docs, both checked under T-7.x)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-5 | ".claude-plugin/marketplace.json at the GitHub repo root has one entry: {"name":"picket","source":{"source":"npm",...}}, plus renames null for picket-status, picket-markdown and picket-session." | request.md:8 | UNCLEAR | Replaced by D-004 (r2) and D-002 (r2): inline settings marketplace in `src/lib/shared/install.mts:25`, root marketplace.json for development only, no renames. The record says this was the user's ruling of 2026-11-08, but no reply text in replies.jsonl shows it |
| S-7 | "Register the marketplace as {"source":"github","repo":"picketai/picket"} instead of the npm folder's absolute path; drop marketplaceRoot()" | request.md:13 | UNCLEAR | `marketplaceRoot` is gone. The GitHub source was replaced by the settings source (`src/lib/verbs/init/init.mjs:164`, D-008 (r2)) on the same ruling, which only the record carries |

The 13 PASS rows, with evidence:
- dist/package.json and publish from ./dist: `scripts/build.mjs:242-252`, `.github/workflows/release.yml:131,137`.
- bin keeps bin/picket.mjs: `scripts/build.mjs:245`. I ran npx `--package` on the packed tarball and `picket help` printed the verb list.
- One hooks.json with command hooks and modules: `scripts/build.mjs:120`, `src/mods/index.tsx:26`.
- Markdown switch read by the module: `src/mods/markdown/hooks/index.tsx:21,38`.
- The alpha dist-tag and the npx bootstrap.
- Install only picket@picketai and retire the old plugins: `init.mjs:205,250`.
- PATH shadow warning: `src/lib/verbs/init/shadow.mts:46`.
- No default statusLine, and uninstall updated to match.
- Cost removed from the status line.
- The self-contained bundle and its SessionStart copy hook.
- Ledger kept at v2 without the cost field.
- `picket cost` in tokens.
- The close audit line, printed and saved.

Alignment: PASS (39 graded; T-3.6, T-3.7, T-4.7, T-5.7, T-5.8, T-6.8, T-7.5 DEFERRED with the owners and gates the plan names). I graded T-1.7, T-2.6, T-3.8 and T-4.6 PASS under the OQ-008 exception: `claude plugin test dist` gives 105 pass and 25 fail, all status pane and band tests, and tsc exits 0.
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-5, S-7: the request asks for a GitHub root marketplace with an npm entry and renames, but the code ships an inline settings marketplace with no renames (D-004 (r2), D-008 (r2)). Please confirm the 2026-11-08 ruling with the user, since no saved reply records it.
Findings: 0 critical, 0 major, 3 minor
- [Minor] src/lib/verbs/close/audit.mts:6: `TURN_EVENTS` and `isTurn` copy the same set and guard from `src/lib/verbs/cost/index.mts:33`. Exporting them from `src/lib/shared/ledger.mts` beside `turnTokens` would keep one definition of what counts as a turn.
- [Minor] CHANGELOG.md:21: the unreleased alpha.6 section still says `M↓` works "while picket-markdown is installed". After D-003 (r3) it is hidden when `mods.markdown` is false. Also, the blank line at CHANGELOG.md:20 splits the Added list.
- [Minor] dist/README.md: the README copied into dist (D-001) makes `claude plugin validate --strict dist` print an advisory about a missing marketplace install line. Validation still passes.
Classes: none
Checked: mutation baseline red, so no mutant was spot-checked. summary.json was computed against HEAD (empty `changed_files` and `silenced`), so I reviewed the full 2646b20..a6d2315 range and found no new skip, only or suppression; the deleted tests are the session stub and old init flows that D-002 and D-008 replace. 115 targeted unit tests and 159 repo, cli and kernel tests pass; `claude plugin validate --strict dist` passes. Drives in the scratchpad: init twice (created, then unchanged, no absolute path); cost on a copy of the ledger (tokens, `by_work`, no `cost_usd`); close (Audit line, audit.txt in the close commit); npx on the packed tarball.

APPROVED
