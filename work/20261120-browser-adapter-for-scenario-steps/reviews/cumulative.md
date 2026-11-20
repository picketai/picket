## Review: 20261120-browser-adapter-for-scenario-steps · cumulative

APPROVED: the fix round closes both Major findings. The three budget reasons now sit next to their numbers, and the browser driver's port is published on loopback only.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A scenario card and a tester case may use the browser step words open, fill, click and see against a service of the item's test environment." | request.md:5 | PASS | src/lib/shared/scenarios/format.mts:4; skill-examples.test.mts T-3.3 |
| S-2 | "An element is named by what the user sees (its visible text or its label), never by a selector." | request.md:5 | PASS | src/lib/shared/browser/driver.mjs:35-62 uses only label, role and text lookups |
| S-3 | "The steps run through a browser adapter that drives Playwright from a pinned container of the environment" | request.md:5 | PASS | src/lib/shared/env/rules.mts E15 together with the E6 digest rule; service.mts overlay |
| S-4 | "behind the same adapter contract as the HTTP adapter and with its own line budget" | request.md:5 | PASS | src/lib/shared/scenarios/browser.mts:7; test/timing/budgets.test.mjs:24 |
| S-5 | "A card that mixes HTTP and browser steps runs whole." | request.md:5 | PASS | runner.mts:131-148; driver.test T-2.4 |
| S-6 | "A browser scenario is saved, replayed, compared and kept like an HTTP one, and a pass through a mock is flagged the same way." | request.md:5 | PASS | replay.mts:75; replay.test and keep-cases.test T-1.5 |
| S-7 | "an unknown word fails with its name" | request.md:3 | PASS | format.mts:211-216; check.test.mts:135 |
| S-8 | "a line budget for each adapter and for the core" | request.md:3 | PASS | budgets.test.mjs:22-25 |
| S-9 | "selectors, scripts, conditions or loops in a card; screenshots or visual comparison; a browser installed on the host" | request.md:7 | PASS | the grammar has no selector slot; playwright-core loads only in the container, from the driver's `main` |

Alignment: PASS (23; T-2.8 DEFERRED: QA, the release QA pass)
Decisions: HONOURED
Regression: none. env/rules.mts now takes `BROWSER_ROLE` and `PLAYWRIGHT_VERSION` from env/standard.mts, and service.mts re-exports both, so D-004's single version constant still holds.
Sources: none
Questions: none
Findings: clean
Checked: each budget number recomputed with the test's own line count (core 705 to 750, adapter 38 to 50, driver 167 to 200). Craft lint flags the three new budget comments as candidates, and each matches an approval in `work/<id>/comments.jsonl` word for word; the driver's matches its re-approval at 167 lines. `service.test` asserts `host_ip: "127.0.0.1"`, and `driver.test` runs a failed Chromium start, then a good one, through `startDriver`. 83 targeted tests pass and `tsc -p .` is clean.

APPROVED
