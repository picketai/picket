---
kind: design
lane: design
title: Close saved scenario review follow-ups
date: 2026-11-15
audience: developer
sources:
  - work/20261115-close-saved-scenario-review-follow-ups/request.md
  - work/20261115-saved-scenarios-and-kernel-replay/reviews/checkpoint.md
  - work/20261115-saved-scenarios-and-kernel-replay/reviews/cumulative.md
  - work/20261115-saved-scenarios-and-kernel-replay/design.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - src/lib/shared/env/config-entries.mts
  - src/lib/shared/drive-log.mts
  - src/lib/shared/drive-log.variants.test.mts
  - src/lib/shared/env/config-entries.variants.test.mts
  - src/lib/shared/scenarios/rules.mts
  - src/lib/shared/scenarios/compare.mts
  - src/lib/shared/scenarios/replay.mts
  - src/lib/shared/scenarios/keys.mts
  - src/lib/shared/scenarios/keep.mts
  - src/lib/shared/scenarios/base-run.mts
  - src/lib/shared/scenarios/format.mts
  - src/lib/shared/scenarios/http.mts
  - src/lib/shared/route/apply.mts
  - src/lib/shared/route/commit.mts
  - src/lib/verbs/env/start.mts
  - src/lib/verbs/env/replay.mts
  - src/lib/verbs/verify/index.mts
  - src/lib/verbs/close/close.mts
  - test/support/variants.mts
  - test/repo/conventions.test.mjs
  - test/timing/budgets.test.mjs
phases:
  - n: 1
    files: [src/lib/shared/env/config-entries.mts, src/lib/shared/env/config-entries.test.mts, src/lib/shared/env/config-entries.variants.test.mts, src/lib/shared/drive-log.test.mts, src/lib/shared/drive-log.variants.test.mts, src/lib/shared/scenarios/rules.test.mts, src/lib/shared/scenarios/rules.variants.test.mts, test/support/variants.mts]
    greps:
      - path: src/lib/shared/env/config-entries.mts
        pattern: \bORDINARY_CODE_NAMES\b
      - path: src/lib/shared/env/config-entries.mts
        pattern: \bcountrycode\b
      - path: test/support/variants.mts
        pattern: export const jsonPlaces\b
      - path: test/support/variants.mts
        pattern: export const jsonKeySpellings\b
      - path: src/lib/shared/drive-log.variants.test.mts
        pattern: \bconst jsonPlaces\b
        absent: true
      - path: src/lib/shared/scenarios/rules.variants.test.mts
        pattern: \bclosureTests\(
    tests: true
    drive: false
    security: true
  - n: 2
    files: [src/lib/shared/env/config-entries.mts, src/lib/shared/env/config-entries.test.mts, src/lib/shared/drive-log.mts, src/lib/shared/drive-log.test.mts, src/lib/shared/drive-log.variants.test.mts, src/lib/shared/scenarios/rules.mts, src/lib/shared/scenarios/rules.test.mts, src/lib/shared/scenarios/rules.variants.test.mts, src/lib/shared/scenarios/keep.test.mts]
    greps:
      - path: src/lib/shared/env/config-entries.mts
        pattern: export function mapSecretLeaves\b
      - path: src/lib/shared/drive-log.mts
        pattern: \bmapSecretLeaves\(
      - path: src/lib/shared/scenarios/rules.mts
        pattern: \bmapSecretLeaves\(
      - path: src/lib/shared/drive-log.mts
        pattern: \bfunction maskedValue\b
        absent: true
      - path: src/lib/shared/scenarios/rules.mts
        pattern: \bfunction isLiteralSecret\b
        absent: true
    tests: true
    drive: false
    security: true
  - n: 3
    files: [src/lib/shared/scenarios/compare.mts, src/lib/shared/scenarios/compare.test.mts, src/lib/shared/scenarios/replay.mts, src/lib/shared/scenarios/replay.test.mts, src/lib/verbs/env/replay.test.mts]
    tests: true
    drive:
      - covers: T-3.6
        command: node dist/bin/picket.mjs env replay 20261115-close-saved-scenario-review-follow-ups --affected
        exit_code: 2
        contains: ["not replayed: no container engine"]
    security: false
  - n: 4
    files: [src/lib/shared/env/stack-start.mts, src/lib/shared/env/stack-start.test.mts, src/lib/verbs/env/start.mts, src/lib/shared/scenarios/base-run.mts, src/lib/shared/scenarios/format.mts, src/lib/shared/scenarios/format.test.mts, src/lib/shared/scenarios/http.mts]
    greps:
      - path: src/lib/shared/env/stack-start.mts
        pattern: export function serviceEndpoints\b
      - path: src/lib/shared/env/stack-start.mts
        pattern: export function unprovedBuild\b
      - path: src/lib/shared/env/stack-start.mts
        pattern: export function writeOverride\b
      - path: src/lib/verbs/env/start.mts
        pattern: stack-start\.mts
      - path: src/lib/shared/scenarios/base-run.mts
        pattern: stack-start\.mts
      - path: src/lib/verbs/env/start.mts
        pattern: '\bfunction (hostUrl|serviceEndpoints|builtRevision|provedBuilds|writeOverride)\b'
        absent: true
      - path: src/lib/shared/scenarios/base-run.mts
        pattern: '\bfunction (hostUrl|endpoints|proveBuilds|writeOverride)\b'
        absent: true
      - path: src/lib/shared/scenarios/base-run.mts
        pattern: \bas Error\b
        absent: true
      - path: src/lib/shared/scenarios/format.mts
        pattern: \bas Error\b
        absent: true
      - path: src/lib/shared/scenarios/http.mts
        pattern: '\bas \{'
        absent: true
      - path: src/lib/shared/scenarios/http.mts
        pattern: \binstanceof Error\b
    tests: true
    drive: false
    security: false
  - n: 5
    files: [src/lib/shared/scenarios/keys.mts, src/lib/shared/scenarios/keys.test.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/index.test.mts]
    greps:
      - path: src/lib/shared/scenarios/keys.mts
        pattern: export function changedSinceReplay\b
      - path: src/lib/verbs/verify/index.mts
        pattern: \bfunction changedSinceReplay\b
        absent: true
      - path: src/lib/verbs/close/close.mts
        pattern: \bchangedSinceReplay\(
      - path: src/lib/verbs/close/close.mts
        pattern: \bworkingKey\(
    tests: true
    drive: false
    security: true
  - n: 6
    files: [src/lib/shared/scenarios/keep.mts, src/lib/shared/scenarios/keep.test.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/apply.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/scenarios/keep.mts
        pattern: export function restoreKept\b
      - path: src/lib/shared/route/apply.mts
        pattern: \brestoreKept\(
    tests: true
    drive: false
    security: false
---
# Design: Close saved scenario review follow-ups

## Problem

The checkpoint and cumulative reviews of `work/20261115-saved-scenarios-and-kernel-replay` (`reviews/checkpoint.md`, `reviews/cumulative.md`) left eight gaps in the saved scenarios, which SDR 00004 (Ratified) binds: a kept scenario is something that ran and passed (D-005), what was not proven is said plainly (D-011), and the user approves what changes (D-010). Two premises of the request do not hold on base `d8635b8f`, and this design follows the code. A probe on 2026-11-15 showed `maskedBody('{"secret":{"value":"hunter2"}}')` returns its input unchanged, so the drive log does not mask a nested secret either; and `base-run.mts` lives in `shared/`, which may import only `shared` and `util` (`test/repo/conventions.test.mjs:141`), so it cannot import from `src/lib/verbs/env/start.mts`. The card rule also has no closure test today, though `CONTRIBUTING.md` C-020 asks one of every guard.

## Decisions

### D-001: `code` is secret unless it sits in an ordinary compound
**Decision:** Infrastructural decision. `isSecretName(name)` in `src/lib/shared/env/config-entries.mts` keeps its signature and its one list, so the drive log mask, the card rule (headers and JSON bodies) and the config scan change together. It builds a plain form of the name (lower case, with whitespace, `_`, `-` and `.` removed), deletes from it every entry of a new closed constant `ORDINARY_CODE_NAMES` (`countrycode`, `postalcode`, `postcode`, `zipcode`, `statuscode`, `errorcode`, `currencycode`, `languagecode`, `regioncode`, `exitcode`), then matches `SECRET_WORDS` as today; `code` stays in that list. A probe of this rule on 2026-11-15 passed `countryCode`, `postalCode`, `statusCode`, `zipCode`, `country_code` and `STATUS-CODE`, and still matched `authCode`, `passcode`, `code`, `auth_code`, `x-auth-code`, `code_verifier`, `user_code`, `x-code`, `codeHash` and `countryCodeAuthCode`; no ordinary entry holds another secret word. The removed separators only add matches (`api_key` and `private_key` have `apikey` and `privatekey` beside them), and they close `x-api-key` as a body key, which the card rule misses today because it passes the key raw.
**Instead of:** a list of secret `code` compounds (`authcode`, `passcode`) with `code` matched only alone: an unlisted secret spelling such as `smsCode` would reach the drive log and a card in clear text, while an unlisted ordinary key under this design only costs a kept check.
**Risks:**
- **RISK-001** An ordinary key outside the list (`productCode`, `promoCode`) is still masked, so its check is not kept. Mitigation: the not-kept line says the body held a masked secret, and the list is one constant (OQ-001).
- **RISK-002** Removing separators joins words, so a few more names match. Mitigation: a join can only add a match, which fails closed.

### D-002: One walker finds secret leaves at any depth
**Decision:** Infrastructural decision. `config-entries.mts` exports `mapSecretLeaves(value: unknown, onLeaf: (leaf: string | number, key: string) => unknown): unknown`. It walks objects and arrays; once a key passes `isSecretName`, every string or number leaf below it, at any depth and inside arrays, is passed to `onLeaf` with the nearest secret-named key above it, and the leaf is replaced by what `onLeaf` returns. Booleans and `null` pass through. The drive log's `maskedBody` maps each such leaf to `***`; the card rule refuses each number and each string `holdsLiteral` accepts, naming the key once per step in first-seen order, with the message it uses today. A probe of this walker turned `{"secret":{"value":"hunter2"}}` into `{"secret":{"value":"***"}}` and `{"tokens":["abc"]}` into `{"tokens":["***"]}`, and left `{"password":true}` alone.
**Instead of:** changing the card rule alone, as the request words it: the drive log under `.picket/state/` would still store the nested value in clear text, against the security-paths rule that no secret is logged, and the mask and the rule would keep two walkers that drift apart.
**Risks:**
- **RISK-003** A boolean under a secret-named key (`{"password":true}`) is neither masked nor refused, though the checkpoint review asked for booleans too. Mitigation: a boolean holds no credential, and refusing it would block flags such as `rememberPassword`; OQ-002 asks the user.

### D-003: A flipped pass is classed `unstable`
**Decision:** Infrastructural decision. `classify` in `src/lib/shared/scenarios/compare.mts` checks `unstable` before `passed`, so a run that fails and then passes gets the class `unstable`. The stored row keeps `outcome: passed` and `unstable: true`; the printed line, the replay summary and verify's summary all follow the class. `BLAMED` stays `new failure` and `no base result`, so `unstable` is still not blamed on the item.
**Instead of:** printing `passed (unstable)` while the class stays `passed`: the summaries count classes, so the count would still say `passed` and the flip would stay hidden (SDR D-011).

### D-004: The stack helpers move to a shared module
**Decision:** Infrastructural decision. A new `src/lib/shared/env/stack-start.mts` exports `writeOverride(root, stack, doc): string`, `unprovedBuild(engine, sources, key): string | null` (the first `<image> was not built from <version>`, or `null`) and `serviceEndpoints(engine, root, stack, files, services): Record<string, string>`, with `hostUrl`, `ANY_ADDRESS` and `LOCALHOST` private to it. `start.mts` throws `Refused` and `base-run.mts` throws `BaseFailure` with the text `unprovedBuild` returns, so each keeps its own error kind. `writeOverride` is a fourth copy the reviews did not name; it moves too.
**Instead of:** exporting the helpers from `start.mts`, as the request words it: `base-run.mts` is in `shared/`, and the import-zone test fails any `shared` import of `verbs/`.
**Risks:**
- **RISK-004** The two callers filtered services differently (`base-run.mts` skipped portless services itself). Mitigation: `serviceEndpoints` skips a service with no port, and the existing start and base-run tests pin both callers.

### D-005: The fast close compares the affected run's key with the working tree
**Decision:** Infrastructural decision. `refuseUnreplayedFastClose` in `src/lib/verbs/close/close.mts` checks in this order: no `affected` run refuses (as today); a run row with a `reason` passes (as today, prior D-008); a blamed result refuses (as today, and it needs no engine); then it reads the model through the engine it is given and compares `run.key` with `keyId(workingKey(...))`. A different key refuses with `stale: <changed> changed since the affected replay; run picket env replay <id> --affected`. No engine, or a model that does not read, refuses with `the affected replay cannot be checked against the working tree: <reason>; run picket env replay <id> --affected`. `changedSinceReplay` moves from `src/lib/verbs/verify/index.mts` to `src/lib/shared/scenarios/keys.mts`, exported, so verify and close name a change the same way.
**Instead of:** accepting the run when no engine answers at close: an edit after the replay is exactly what the close must catch, and a missing check fails closed; a replay with no engine still stores a reason row, which passes as prior D-008 has it.
**Risks:**
- **RISK-005** An engine that is down at close refuses a close it would have accepted. Mitigation: the refusal names the command, and the replay then records why nothing ran.

### D-006: Kept files are restored when the phase commit fails
**Decision:** Infrastructural decision. `keepCandidates` in `src/lib/shared/scenarios/keep.mts` records, for each path it writes, the text the path held before (`null` for a new card) in a new `KeptFiles.before: { path: string; text: string | null }[]`. `commitPhase` in `src/lib/shared/route/commit.mts` returns `{ lines: string[]; sha: string | null }` instead of the lines alone. When `applyChanges` gets no sha, it calls a new `restoreKept(root, kept): string[]`, which deletes each new card, writes back each deprecated card's earlier text, and returns `S-<id> not kept: the phase commit failed` for a new card and `S-<id> left active: the phase commit failed` for a card it had deprecated. On success nothing changes: the kept files ride the phase commit.
**Instead of:** writing the files only after the commit succeeds: they would need a second commit or stay uncommitted, so the phase commit would no longer carry them (prior D-006).
**Risks:**
- **RISK-006** A restored card is deleted, and SDR D-010 says a scenario is never rewritten. Mitigation: that card never reached history; the rule covers committed scenarios.
- **RISK-007** The approval marker is already written when the commit fails, so that phase's candidates are not kept later. Mitigation: the lines name every candidate that was not kept, so the user sees the loss.

## Scope

**In:**
- The `code` match in `isSecretName` and the closure seeds of the mask and the card rule (D-001).
- Secret leaves at any depth in the drive log mask and the card rule (D-002).
- The class, print and summary of a flipped pass (D-003).
- `--affected` keeping scenarios whose card does not parse, and the missing no-engine `affected` test.
- The shared stack helpers (D-004) and `instanceof Error` narrowing in `format.mts`, `http.mts` and `base-run.mts`.
- The stale-key refusal of the fast close (D-005).
- Restoring kept files on a failed phase commit (D-006).

**Out:**
- Build step 4 (the tester), the in-place guard's open spellings, results shared across machines, any change to the card format.
- The other over-broad secret words (`sig`, `sas`): OQ-003.
- The `isBuiltApp` copies in `keys.mts` and `base-run.mts`, which the request does not name.
- The family list in `CONTRIBUTING.md`: OQ-004.

## Phase 1: `code` is secret only outside ordinary compounds

**Touch set:**
- `src/lib/shared/env/config-entries.mts`: `isSecretName` and the ordinary list
- `src/lib/shared/env/config-entries.test.mts`: name and URL pair cases
- `src/lib/shared/env/config-entries.variants.test.mts`: mask closure seeds gain `code`
- `src/lib/shared/drive-log.test.mts`: mask keeps ordinary keys
- `src/lib/shared/drive-log.variants.test.mts`: seeds grow, families move out
- `src/lib/shared/scenarios/rules.test.mts`: card rule passes ordinary keys
- `src/lib/shared/scenarios/rules.variants.test.mts`: new closure test, card rule
- `test/support/variants.mts`: shared JSON body families
- `src/lib/shared/drive-log.mts`: mask caller, read only
- `src/lib/shared/scenarios/rules.mts`: card rule caller, read only

**Changes:**
- `isSecretName` follows D-001: the plain form, `ORDINARY_CODE_NAMES` removed from it, then `SECRET_WORDS`. No caller changes.
- `jsonPlaces` and `keySpellings` move from `drive-log.variants.test.mts` to `test/support/variants.mts`, exported as `jsonPlaces` and `jsonKeySpellings`, spelling what they spell today; `drive-log.variants.test.mts` imports them.
- The `maskedBody` seeds gain `authCode`, `passcode`, `code`, `auth_code` and `code_verifier`; the `masked` seeds in `config-entries.variants.test.mts` gain `code`, `authcode` and `passcode`.
- New `rules.variants.test.mts`: guard `scenarioProblems`, run on a `Card` value built directly with one `request POST {orders}/x` step whose body is the seed (so a pretty-printed body reaches the rule), closed when a problem says `holds a literal secret`; the seeds are the `maskedBody` seeds; the families are `asWritten`, `jsonPlaces` and `jsonKeySpellings`.

**Done when:**
- **T-1.1** `isSecretName` returns `false` for `countryCode`, `postalCode`, `statusCode`, `zipCode`, `country_code` and `STATUS-CODE`, and `true` for `authCode`, `passcode`, `code`, `auth_code`, `code_verifier`, `user_code` and `x-code`.
- **T-1.2** `maskedBody('{"countryCode":"DE","statusCode":200,"authCode":"Kval9"}')` returns `{"countryCode":"DE","statusCode":200,"authCode":"***"}`.
- **T-1.3** `scenarioProblems` returns `[]` for a body `{"countryCode":"DE","postalCode":"10115"}` and for a header `X-Country-Code: DE`, and returns exactly `["step 1: body key passcode holds a literal secret; take it from a capture or {user:<role>.<field>}"]` for a body `{"passcode":"1234"}`.
- **T-1.4** `masked("Url", "https://a.example.com/x?countryCode=DE&code=FUNCKEY")` returns `https://a.example.com/x?countryCode=DE&code=***`, and the `?code=FUNCKEY` case at `config-entries.test.mts:44`, present on base `d8635b8f`, passes unchanged.
- **T-1.5** The closure tests of `maskedBody` and `masked` stay closed with their new seeds, and the new closure test of `scenarioProblems` is closed under `asWritten`, `jsonPlaces` and `jsonKeySpellings`.
- **T-1.6** `npm test` passes.

## Phase 2: Secret leaves at any depth

**Touch set:**
- `src/lib/shared/env/config-entries.mts`: new `mapSecretLeaves` walker
- `src/lib/shared/env/config-entries.test.mts`: walker cases
- `src/lib/shared/drive-log.mts`: mask through the walker
- `src/lib/shared/drive-log.test.mts`: nested mask cases
- `src/lib/shared/drive-log.variants.test.mts`: nested seeds
- `src/lib/shared/scenarios/rules.mts`: card rule through the walker
- `src/lib/shared/scenarios/rules.test.mts`: nested refusal cases
- `src/lib/shared/scenarios/rules.variants.test.mts`: nested seeds
- `src/lib/shared/scenarios/keep.test.mts`: mask output into `candidateCard`
- `src/lib/shared/scenarios/keep.mts`: `***` check, read only
- `test/timing/budgets.test.mjs`: core line budget, read only

**Changes:**
- `config-entries.mts` exports `mapSecretLeaves` as D-002 gives it.
- `drive-log.mts`: `maskedValue` and `maskedJson` give way to `mapSecretLeaves(value, () => MASK)`; the non-JSON path through `masked(null, text)` stays.
- `rules.mts`: `isLiteralSecret` and `literalSecretKeys` give way to one collector over `mapSecretLeaves`: a number always counts, a string counts when `holdsLiteral` accepts it, each key is named once per step, and the message stays `step <n>: body key <key> holds a literal secret; take it from a capture or {user:<role>.<field>}`. The core stays within `scenario_core_lines` (600; the four core files hold 550 lines on base `d8635b8f`, by `wc -l`).
- Both closure tests gain three nested seeds: `{"secret":{"value":"Kval9"}}`, `{"tokens":["Kval9"]}` and `{"password":{"items":[{"v":"Kval9"}]}}`.

**Done when:**
- **T-2.1** `maskedBody` returns `{"secret":{"value":"***"}}` for `{"secret":{"value":"hunter2"}}`, `{"tokens":["***"]}` for `{"tokens":["abc"]}`, and `{"auth":{"code":"***"}}` for `{"auth":{"code":"Kval9"}}`.
- **T-2.2** `scenarioProblems` returns exactly `["step 1: body key secret holds a literal secret; take it from a capture or {user:<role>.<field>}"]` for a body `{"secret":{"value":"hunter2"}}`, and exactly one problem, naming `tokens`, for `{"tokens":["a","b"]}`.
- **T-2.3** A nested value made only of sources passes: a body `{"password":{"value":"{user:admin.password}"}}` gives `[]`, and so does `{"auth":{"token":"{token}"}}` after a `capture token json token` step.
- **T-2.4** `{"password":true}` and `{"secret":null}` are neither masked by `maskedBody` nor refused by `scenarioProblems` (D-002's boundary).
- **T-2.5** The closure tests of `maskedBody` and `scenarioProblems` are closed for the three nested seeds under every family they run.
- **T-2.6** A candidate whose drive hit body is the real output of `maskedBody('{"secret":{"value":"hunter2"}}')` gets `candidateCard`'s `not kept` with `the logged body holds a masked secret`.
- **T-2.7** `drive-log.mts` holds no `maskedValue` and `rules.mts` no `isLiteralSecret`, and `npm test` passes, the scenario core budget included.

## Phase 3: A flipped pass prints as unstable, and `--affected` keeps broken cards

**Touch set:**
- `src/lib/shared/scenarios/compare.mts`: `classify` order
- `src/lib/shared/scenarios/compare.test.mts`: flipped pass case
- `src/lib/shared/scenarios/replay.mts`: `affected` keeps null cards
- `src/lib/shared/scenarios/replay.test.mts`: null card case
- `src/lib/verbs/env/replay.test.mts`: print, broken card, no-engine `affected`
- `src/lib/verbs/env/replay.mts`: print and summary, read only

**Changes:**
- `classify` follows D-003: `unstable` before `passed`.
- `affected(scenarios, working, base)` keeps every scenario whose `card` is `null`, whether or not the key changed; `replayScenarios` already classes such a card `blocked`.
- `replay.test.mts` (verb) gains three cases: an adapter that answers 500 and then 200; a hand-broken card under `--affected`; the no-engine run with mode `affected`, beside the existing `full` one at line 134.

**Done when:**
- **T-3.1** `classify` returns `unstable` for `{ outcome: "passed", unstable: true }` and `passed` for `{ outcome: "passed", unstable: false }`, each against a stored `passed` base row, and `isBlamed("unstable")` is `false`.
- **T-3.2** An `env replay` whose adapter fails S-0001's first attempt and passes its second prints a line starting `S-0001 unstable` and the summary `replayed 1 on <stack>: 1 unstable`, reports `ok: true`, and stores a result row with `outcome: passed`, `unstable: true` and `class: unstable`.
- **T-3.3** `affected` with the working key equal to the base key returns exactly the scenarios whose card is `null`, and with the `env` part changed returns every scenario; the existing T-4.4 test in `src/lib/shared/scenarios/replay.test.mts`, present on base `d8635b8f`, passes unchanged.
- **T-3.4** `env replay --affected` on an item with no app change, where S-0002's file has no header block, prints a `blocked` line with `header: a card starts with a --- header block` and a summary counting `1 blocked`.
- **T-3.5** With no engine, `env replay --affected` stores one `run` row with mode `affected` and reason `no container engine`, and renders `not replayed: no container engine`.
- **T-3.6** `node dist/bin/picket.mjs env replay 20261115-close-saved-scenario-review-follow-ups --affected`, driven as `picket drive --run "<that command>" --env PICKET_ENGINE=none`, exits 2 and prints `not replayed: no container engine`.

## Phase 4: One copy of the stack helpers, and narrowed error casts

**Touch set:**
- `src/lib/shared/env/stack-start.mts`: new shared stack helpers
- `src/lib/shared/env/stack-start.test.mts`: endpoint and proof cases
- `src/lib/verbs/env/start.mts`: imports the helpers
- `src/lib/shared/scenarios/base-run.mts`: imports helpers, narrows cast
- `src/lib/shared/scenarios/format.mts`: narrows the header cast
- `src/lib/shared/scenarios/format.test.mts`: unreadable header case
- `src/lib/shared/scenarios/http.mts`: narrows the failure cast
- `src/lib/shared/env/engine.mts`: `runCompose`, `jsonRecords`, read only
- `src/lib/shared/env/build-plan.mts`: `REVISION_LABEL`, read only
- `src/lib/verbs/env/start.test.mts`: before-image of start, read only
- `src/lib/shared/scenarios/base-run.test.mts`: before-image of base run, read only
- `src/lib/shared/scenarios/http.test.mts`: before-image of adapter, read only
- `test/repo/conventions.test.mjs`: import zones, read only

**Changes:**
- New `stack-start.mts` as D-004 gives it. `serviceEndpoints` takes the started services and skips one with no port or a failed `port` call; `base-run.mts` passes its model's services with no profile.
- `start.mts` drops `writeOverride`, `builtRevision`, `provedBuilds`, `hostUrl`, `serviceEndpoints`, `ANY_ADDRESS` and `LOCALHOST`; `base-run.mts` drops `writeOverride`, `proveBuilds`, `hostUrl`, `endpoints`, `ANY_ADDRESS` and `LOCALHOST`. Each throws its own error with `unprovedBuild`'s text.
- `format.mts` (`readFront`) and `base-run.mts` (`runBase`) take the message from `err instanceof Error ? err.message : String(err)`. `http.mts`'s `failureCode` takes `unknown`, narrows with `instanceof Error`, reads `cause.code` only when the cause is an object whose `code` is a string, falls back to the error's name, and gives `String(err)` for a non-Error.

**Done when:**
- **T-4.1** `start.mts` and `base-run.mts` define none of the moved helpers and both import from `stack-start.mts`.
- **T-4.2** `serviceEndpoints` over a fake engine maps a published `0.0.0.0:49153` and `[::]:49153` to `http://127.0.0.1:49153`, keeps `10.0.0.5:8080` as `http://10.0.0.5:8080`, and leaves out a service with no port and one whose `port` call exits 1.
- **T-4.3** `unprovedBuild` returns `<image> was not built from <version>` for the first image whose revision label differs and `null` when every label matches.
- **T-4.4** The tests in `start.test.mts`, `base-run.test.mts` and `http.test.mts`, present on base `d8635b8f`, pass unchanged, so the published-port URL, the revision refusal, the base run's clean-up and the adapter's `ECONNREFUSED` and `TimeoutError` codes are as before.
- **T-4.5** `parseScenario` of a card whose fourth line, inside the header after `id` and `kind`, is `not a pair` returns exactly `['header: yaml-lite: expected "key: value" at line 4: not a pair']`.
- **T-4.6** `format.mts`, `http.mts` and `base-run.mts` hold no `as Error` and no `as {` cast, and `npm test` passes, the import-zone test and the adapter budget included.

## Phase 5: The fast close refuses a stale affected replay

**Touch set:**
- `src/lib/shared/scenarios/keys.mts`: receives `changedSinceReplay`
- `src/lib/shared/scenarios/keys.test.mts`: changed app naming cases
- `src/lib/verbs/verify/index.mts`: imports `changedSinceReplay`
- `src/lib/verbs/close/close.mts`: stale and unchecked refusals
- `src/lib/verbs/close/index.test.mts`: umbrella fixture close cases
- `src/lib/shared/env/build-plan.mts`: `sourceFor`, read only
- `src/lib/shared/env/engine.mts`: `machineCheck`, `readModelJson`, read only
- `src/lib/verbs/verify/index.test.mts`: before-image of stale text, read only
- `test/fixtures/env/umbrella/.picket/env/compose.yaml`: fixture environment, read only
- `test/fixtures/env/compose-config.json`: recorded model, read only

**Changes:**
- `changedSinceReplay(root, layout, model, run, env): string` moves to `keys.mts`, exported, unchanged in what it returns; verify imports it.
- `refuseUnreplayedFastClose` takes the snapshot and the `CloseContext` and checks in D-005's order. The engine and model come from `machineCheck` and `readModel(readModelJson(engine, root))`; the reason when either is missing is the first `machine.missing` entry up to its colon, else `no container engine`, as verify words it, or the model error's message.
- `index.test.mts` gains an umbrella-fixture fast item (the fixture copied into a temp git repo, an engine runner that answers `compose config` with `test/fixtures/env/compose-config.json`). The existing pass case without a reason moves to it with the real working key, since its made-up key `k` is now stale; the reason case and the new-failure refusal stay as they are.

**Done when:**
- **T-5.1** A fast umbrella item whose latest `affected` run carries the working key and only `passed` and `failing before the item` results closes: status `done`, HEAD moves.
- **T-5.2** When `services/orders/server.mjs` is edited after that run (whose `versions` were taken before the edit), close refuses with exactly `stale: orders changed since the affected replay; run picket env replay <id> --affected`; the item stays open and HEAD does not move.
- **T-5.3** With a keyed `affected` run and no engine at close, close refuses with exactly `the affected replay cannot be checked against the working tree: no container engine; run picket env replay <id> --affected`, and the item stays open.
- **T-5.4** The T-10.2 refusal test (a new failure, no engine), the reason case and the T-10.3 cases in `close/index.test.mts`, present on base `d8635b8f`, pass unchanged.
- **T-5.5** Verify's T-6.4 test, present on base `d8635b8f`, still gets `stale: orders changed since the replay; run picket env replay <id>`, and `verify/index.mts` no longer defines `changedSinceReplay`.
- **T-5.6** `npm test` passes.

## Phase 6: A failed phase commit restores the kept files

**Touch set:**
- `src/lib/shared/scenarios/keep.mts`: `before` texts and `restoreKept`
- `src/lib/shared/scenarios/keep.test.mts`: `before` and restore cases
- `src/lib/shared/route/commit.mts`: `commitPhase` returns the sha
- `src/lib/shared/route/apply.mts`: restores when no sha
- `src/lib/verbs/route/index.test.mts`: failed commit approval cases
- `src/lib/shared/git.mts`: `commitOwned` result, read only
- `src/lib/shared/scenarios/files.mts`: `writeScenarioFile`, read only

**Changes:**
- `KeptFiles` gains `before` as D-006 gives it; `keepCandidates` fills it before each write. New `restoreKept(root, kept): string[]` as D-006 gives it.
- `commitPhase` returns `{ lines, sha }`: `sha` is `result.sha`, and `null` when `commitOwned` throws or commits nothing. `applyChanges` (its only caller) spreads `lines` as today and, for a commit change with `sha === null`, appends `restoreKept`'s lines.
- `index.test.mts` reuses `keepingItem` with a root `commit-msg` hook that exits 1, as the existing T-1.6 test does.

**Done when:**
- **T-6.1** With a root `commit-msg` hook that exits 1, approving a phase with one passed candidate leaves `.picket/env/scenarios/` holding only `S-0001.md`, byte-equal to its text before the approval, and the applied lines include one starting `git commit failed` and `S-0002 not kept: the phase commit failed`.
- **T-6.2** The same with a candidate that replaces S-0001 leaves `S-0001.md` byte-equal to its committed text (status `active`, no `superseded_by`) and no `S-0002.md`, and the applied lines include `S-0001 left active: the phase commit failed`.
- **T-6.3** After either failed approval, `git status --porcelain` in the test repository lists no path under `.picket/env/scenarios/`.
- **T-6.4** `keepCandidates` for a candidate that replaces S-0001 returns `before` holding S-0001's earlier text and `null` for `S-0002.md`.
- **T-6.5** The T-9.4 and T-9.5 tests in `route/index.test.mts`, present on base `d8635b8f`, pass unchanged, so a successful approval still commits the kept and deprecated cards in the phase commit.
- **T-6.6** `npm test` passes.

## Open questions

- **OQ-001** Which other ordinary `code` compounds belong in `ORDINARY_CODE_NAMES`, such as `productCode` or `promoCode`? Separator spellings such as `country_code` are already covered. Owner: the product owner. Fallback: the ten names of D-001; an unlisted one stays masked and its check is not kept.
- **OQ-002** Should a boolean under a secret-named key (`{"password":true}`) be refused, as the checkpoint review asked? Owner: the user. Fallback: strings and numbers only (D-002).
- **OQ-003** `sig` and `sas` match inside ordinary words (`design`, `signal`, `assignee`), the same fault as `code`. Owner: the user, as a follow-up item. Fallback: unchanged here, since the request names only `code`.
- **OQ-004** `CONTRIBUTING.md`'s family list does not name `jsonPlaces` and `jsonKeySpellings` once they move into `test/support/variants.mts`. Owner: the lead, through `picket:documenting`. Fallback: the list stays as it is; no test reads it.

## Revision log

