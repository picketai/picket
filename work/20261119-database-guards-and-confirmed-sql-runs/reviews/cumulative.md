## Review: 20261119-database-guards-and-confirmed-sql-runs · cumulative

APPROVED: the staged fix makes the connection reader refuse every string the last review showed naming a second server, as D-002 (r2) and request.md:3 require. Nothing else in the range has changed since that review.

Requirements: PASS (9)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-2 | "picket data run refuses a connection that names any other, before anything runs." | request.md:3 | PASS | src/lib/shared/data/connection.mts:6 SERVER_KEYS adds network address, failover partner, failover_partner; connection.mts:53-55 refuses any URL query and a multi-segment path; connection.test T-1.2 and "each problem names what is missing or repeated" |

Alignment: PASS (36 rows; T-1.2 as reworded passes; T-2.5 and T-4.8 DEFERRED to the product owner and QA as the plan marks them)
Decisions: HONOURED
Regression: none (a URL with a query is now refused, which D-002 (r2) RISK-009 accepts)
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: I re-ran last review's probe strings, plus `FAILOVER PARTNER =prod01`, which is refused, and `postgres://db01/shop#x`, which reads as db01/shop and names no second target. The 55 tests in data, run and escalation pass, and `tsc -p .` is clean. The fix is 3 staged files with no comment added. The unstaged change to bench/results/ask-probe.json is still outside the range and not graded.

APPROVED
