Add the browser adapter (SDR 00004 follow-up TF-009, its D-005, and section 3.1 of artifacts/strategy/drafts/testing-and-test-environment.md).

From the draft: "Step words are a closed list: request, expect, capture, wait; for the browser later open, fill, click, see, with elements named by what the user sees." and "Engines sit behind adapters: HTTP (Node's fetch), browser (Playwright from a pinned container, later), command (only for the architect's check of a CLI phase)." and "Kept light by rules that code checks: a line budget for each adapter and for the core, format: 1 on each card, an unknown word fails with its name, and a format change is handled by recording again from intent, never by a migration script."

A scenario card and a tester case may use the browser step words open, fill, click and see against a service of the item's test environment. An element is named by what the user sees (its visible text or its label), never by a selector. The steps run through a browser adapter that drives Playwright from a pinned container of the environment, behind the same adapter contract as the HTTP adapter and with its own line budget. A card that mixes HTTP and browser steps runs whole. A browser scenario is saved, replayed, compared and kept like an HTTP one, and a pass through a mock is flagged the same way.

Out of this item: Playwright test files written by the tester (rejected in the draft, section 12); selectors, scripts, conditions or loops in a card; screenshots or visual comparison; a browser installed on the host; login flows beyond what fill and click give.

## Brief
purpose: Let a saved scenario and a tester case check what a user sees in the browser, with the same cards, replay and rules as HTTP steps (SDR 00004 TF-009).
in scope: The step words open, fill, click and see in the card format and its rules; elements named by visible text or label; a browser adapter driving Playwright from a pinned container of the test environment, behind the adapter contract and with a line budget; mixed cards; replay, compare, keep and the mock flag for browser scenarios; the testing skill's case step for the new words
out of scope: Playwright test files written by the tester; selectors, scripts, conditions or loops in a card; screenshots or visual comparison; a browser on the host; the sandbox spike (SDR 00005 TF-003); the setting testing
