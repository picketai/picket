## Review: 20261113-apply-four-approved-rule-wording-fixes · cumulative

Approved: commit 144e1b9c changes six lines, one per file, and each copies the text the request approved, word for word. Both size budgets still hold, and CLAUDE.md still starts with the template.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | The security-paths escalation sentence uses the heredoc form | request.md fix 1 | PASS | `/mnt/work/development/github/picket/src/rules/security-paths.md:3` matches exactly. Admit accepts `--request -` together with `--touched` (`/mnt/work/development/github/picket/src/lib/verbs/admit/index.mts:31-35`) |
| S-2 | Rule 2 reads "Only `picket` verbs change state; never edit it by hand." in both the template and CLAUDE.md | request.md fix 2 | PASS | `/mnt/work/development/github/picket/src/templates/claude-block.md:8` and `/mnt/work/development/github/picket/CLAUDE.md:8`. A byte comparison confirms CLAUDE.md still starts with the template |
| S-3 | The Floor entry names `picket` verbs as the state mutators and `route` as the only one that records a verdict | request.md fix 2 | PASS | `/mnt/work/development/github/picket/.claude/MEMORY.md:27` |
| S-4 | The output style names "a shell's or skill's `## Output` block" | request.md fix 3 | PASS | `/mnt/work/development/github/picket/src/output-styles/custom.md:12`, with the line wrapping unchanged |
| S-5 | The prose rule splits only lists of recommendations or requirements, and CLAUDE.md stays within 2048 bytes | request.md fixes 4 and 2 | PASS | `/mnt/work/development/github/picket/src/rules/prose.md:9`. `wc -c CLAUDE.md` prints 2044 |

Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: the old wording is gone from src, dist and the tests (it remains only under work/ and artifacts/reports). The injected rule text is 9893 of 10000 characters, measured with `joinedRules()` on dist. The rules and output style files in dist match src byte for byte. No file has CR line endings, and no guard was removed. The range 00bff4bb..HEAD also contains d65faa96, the close commit of another work item, which I did not review.

APPROVED
