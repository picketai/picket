## Review: 20261114-env-verbs-pass-on-real-engine · crosscheck

The record is consistent: every decision has a phase criterion, every phase implements a decision, and the sources it cites match the code. Only Minor rows were found.

Requirements: N/A (no request saved)
Alignment: PASS
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor
- [Minor] work/20261114-env-verbs-pass-on-real-engine/design.md#D-004: Decision coverage: D-004 (the host pasta fault stays outside Picket) has no criterion of its own. T-2.2 pins the pasta cause text and Scope Out names it, so it is covered by intent. Optionally cite D-004 on T-2.2.
- [Minor] work/20261114-env-verbs-pass-on-real-engine/design.md:195: Terminology: T-1.1 says "the T-2.3 test" and T-1.5 (line 199) says "T-2.7". Those are IDs from an older plan, at `src/lib/shared/env/engine.test.mts:158` and `test/env/model.engine.mjs:17`. This record's own T-2.3 and T-2.7 mean other things. Name those two tests by title instead.
Classes: none
Checked:
- Source claims: I confirmed the cited code at `engine.mts:108-185` and the `lastErrorLine` sites (nine call lines across `engine`, `trial`, `purge`, `start`, `stop` and `status`).
- Test globs: `scripts/test.mjs` picks up the new `test/env/fake-engine.test.mjs` in the product step and runs only `*.engine.mjs` in the env step.
- Fake engine: its current "fake engine: open ..." text matches T-2.4.
- Strategy: no conflict with SDR 00004 D-003.
- Not verified: the Podman stderr captures, which I cannot reproduce here.

ALIGNED
