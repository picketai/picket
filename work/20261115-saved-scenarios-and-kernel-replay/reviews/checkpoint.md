## Review: 20261115-saved-scenarios-and-kernel-replay · checkpoint (phases 1 to 5)

APPROVED: there is no Critical finding and no alignment row at FAIL. Two Major code findings stay open.

Alignment: PASS (T-1.1 to T-1.7, T-2.1 to T-2.7, T-3.1 to T-3.7, T-4.1 to T-4.8, T-5.1 to T-5.5). T-5.6 is DEFERRED to operations, the release workflow's test job.
Decisions: HONOURED
Findings: 0 critical, 2 major, 3 minor
- [Major] src/lib/shared/scenarios/rules.mts:63-71: Se4: the literal-secret refusal only fires when a secret-named key holds a string or number directly.
  - I probed `scenarioProblems`. `{"secret":{"value":"hunter2"}}`, `{"tokens":["abc"]}` and `{"password":true}` each returned `[]`, while `{"password":"hunter2"}` was caught.
  - `env check` therefore reports a card with a literal secret as clean, and a hand-written card could commit it.
  - Fix: treat every string, number or boolean leaf under a secret-named key as literal, at any depth and inside arrays. Phase 7's `maskedBody` must not copy the current shape.
- [Major] src/lib/shared/scenarios/base-run.mts:113-119 and src/lib/verbs/env/start.mts:73-79: Rf2: several helpers are written twice, so a change to how a published port becomes a URL means editing both.
  - `hostUrl` and the `ANY_ADDRESS` and `LOCALHOST` constants.
  - The image revision proof: `proveBuilds` at base-run.mts:104-111 against `builtRevision` and `provedBuilds` at start.mts:56-68.
  - The port lookup: `endpoints` at base-run.mts:121-130 against `serviceEndpoints` in start.mts.
  - `isBuiltApp` in base-run.mts:69 and keys.mts:32.
  - Fix: export `hostUrl`, `builtRevision` and `serviceEndpoints` from start.mts and import them. The phase 5 block says the copy was made because start.mts is outside that phase's touch set, so the architect may need to add it.
- [Minor] src/lib/shared/scenarios/rules.mts:45: Se4: rule 1 only checks that the target starts with `{<service>}`. `request GET {orders}@169.254.169.254/x` passes (probed: `[]`). Node's fetch rejects URLs with credentials, which is the only thing stopping it today. Require the remainder to be empty or start with `/` or `?`. D-002's wording allows the current check, so this is also a note to the architect.
- [Minor] src/lib/verbs/env/replay.test.mts:132-140: the amended T-5.5's sibling T-4.5 says the no-engine row carries mode `affected` under `--affected`, but the test asserts only mode `full`. Hard-coding `full` at replay.mts:121 would pass every test, and phase 10's close reads the `affected` row. Add an `affected` case.
- [Minor] src/lib/shared/scenarios/format.mts:200, src/lib/shared/scenarios/http.mts:6, src/lib/shared/scenarios/base-run.mts:173: E2/T2: `(error as Error).message` and an `err as {...}` cast with no `instanceof Error` narrowing. Every current thrower is an Error, so nothing fails today.

Classes: Se4, Rf2

Checked:
- 125 tests pass across replay, check, start, build-plan, kernel and budgets.
- The two new comments in `test/timing/budgets.test.mjs` match entries in `comments.jsonl`.
- Craft lint reports no errors, and no assertion or guard was removed. The `check.test.mts` and `start.mts` edits only add the new field and the count line.
- T-5.1 and T-5.3 leave no worktree or base folder.
- `runner.mts` puts no resolved value or answer text into `detail` (T-2.5).

APPROVED
