---
kind: order
lane: order
title: Browser adapter for scenario steps
date: 2026-11-20
audience: developer
sources: [work/20261120-browser-adapter-for-scenario-steps/request.md, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, artifacts/strategy/drafts/testing-and-test-environment.md, src/lib/shared/scenarios/format.mts, src/lib/shared/scenarios/rules.mts, src/lib/shared/scenarios/runner.mts, src/lib/shared/scenarios/http.mts, src/lib/shared/scenarios/replay.mts, src/lib/shared/scenarios/keep.mts, src/lib/shared/scenarios/base-run.mts, src/lib/shared/testing/cases.mts, src/lib/shared/testing/keep-cases.mts, src/lib/shared/catalog/entry.mts, src/lib/shared/mocks/stub.mts, src/lib/shared/mocks/stub-server.mjs, src/lib/shared/env/standard.mts, src/lib/shared/env/rules.mts, src/lib/verbs/env/start.mts, src/lib/verbs/env/replay.mts, src/lib/verbs/test/case.mts, scripts/build.mjs, test/timing/budgets.test.mjs, test/repo/package.test.mjs, src/skills/testing/steps/cases.md, "https://raw.githubusercontent.com/microsoft/playwright/v1.65.1/utils/docker/Dockerfile.noble", "https://raw.githubusercontent.com/microsoft/playwright/v1.65.1/docs/src/docker.md"]
phases:
  - n: 1
    files:
      - src/lib/shared/scenarios/format.mts
      - src/lib/shared/scenarios/format.test.mts
      - src/lib/shared/scenarios/rules.mts
      - src/lib/shared/scenarios/rules.test.mts
      - src/lib/shared/scenarios/rules.variants.test.mts
      - src/lib/shared/scenarios/runner.mts
      - src/lib/shared/scenarios/runner.test.mts
      - src/lib/shared/scenarios/browser.mts
      - src/lib/shared/scenarios/browser.test.mts
      - src/lib/shared/scenarios/replay.mts
      - src/lib/shared/scenarios/replay.test.mts
      - src/lib/shared/scenarios/base-run.mts
      - src/lib/shared/catalog/entry.mts
      - src/lib/shared/catalog/entry.test.mts
      - src/lib/shared/catalog/resolve.mts
      - src/lib/shared/catalog/resolve.test.mts
      - src/lib/shared/testing/cases.mts
      - src/lib/shared/testing/keep-cases.test.mts
      - src/lib/verbs/env/replay.mts
      - test/timing/budgets.test.mjs
      - test/fixtures/env/browser-card/.picket/env/compose.yaml
      - test/fixtures/env/browser-card/.picket/env/scenarios/S-0001.md
    greps:
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'word: ?"open"'
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'word: ?"fill"'
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'word: ?"click"'
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'word: ?"see"'
      - path: src/lib/shared/scenarios/browser.mts
        pattern: 'export type BrowserAdapter\b'
      - path: src/lib/shared/scenarios/browser.mts
        pattern: '__picket/step'
      - path: test/timing/budgets.test.mjs
        pattern: 'browser_adapter_lines'
    tests: true
    drive:
      - covers: T-1.7
        command: CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/browser-card" node dist/bin/picket.mjs env check
        exit_code: 2
        contains: ["E11 S-0001: rule 1: step 1 opens https://example.com/login", "holds a literal secret"]
  - n: 2
    files:
      - src/lib/shared/env/standard.mts
      - src/lib/shared/env/rules.mts
      - src/lib/shared/env/rules.test.mts
      - src/lib/shared/browser/service.mts
      - src/lib/shared/browser/service.test.mts
      - src/lib/shared/browser/driver.mjs
      - src/lib/shared/browser/driver.test.mts
      - src/lib/verbs/env/start.mts
      - src/lib/shared/env/trial.mts
      - src/lib/shared/scenarios/base-run.mts
      - src/lib/shared/testing/cases.mts
      - src/lib/shared/testing/cases.test.mts
      - src/lib/verbs/env/replay.mts
      - scripts/build.mjs
      - package.json
      - package-lock.json
      - test/timing/budgets.test.mjs
      - test/repo/package.test.mjs
      - test/fixtures/env/browser/.picket/env/compose.yaml
    greps:
      - path: src/lib/shared/env/standard.mts
        pattern: '"browser"'
      - path: src/lib/shared/env/rules.mts
        pattern: '"E15"'
      - path: src/lib/shared/browser/driver.mjs
        pattern: 'getByLabel\('
      - path: src/lib/shared/browser/driver.mjs
        pattern: 'getByText\('
      - path: src/lib/shared/browser/driver.mjs
        pattern: '\.(?:locator|evaluate)\('
        absent: true
      - path: package.json
        pattern: '"playwright-core": "1\.65\.1"'
      - path: scripts/build.mjs
        pattern: 'playwright-core'
      - path: test/timing/budgets.test.mjs
        pattern: 'browser_driver_lines'
    tests: true
    drive:
      - covers: T-2.7
        command: CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/browser" node dist/bin/picket.mjs env check
        exit_code: 2
        contains: ["E15 browser: image mcr.microsoft.com/playwright:v1.50.0-noble", "v1.65.1"]
  - n: 3
    files:
      - src/skills/testing/steps/cases.md
      - src/lib/verbs/test/skill-examples.test.mts
    greps:
      - path: src/skills/testing/steps/cases.md
        pattern: 'open \{'
      - path: src/skills/testing/steps/cases.md
        pattern: 'fill "[^"]+" with "'
      - path: src/skills/testing/steps/cases.md
        pattern: 'click "'
      - path: src/skills/testing/steps/cases.md
        pattern: 'see "'
    tests: true
    drive: false
---
# Order: Browser adapter for scenario steps

## Problem
A saved scenario and a tester case can only send HTTP requests today, so nothing checks what a user sees in the browser (SDR 00004 TF-009, its D-005, draft section 3.1). The card grammar is a closed word list in `src/lib/shared/scenarios/format.mts:4`, each engine sits behind an adapter with a line budget (`test/timing/budgets.test.mjs:22-23`), and every image of the environment is pinned by digest (rule E6, `src/lib/shared/env/rules.mts:31`). The official Playwright image carries the browsers but not the Playwright package (its `Dockerfile.noble` removes `/ms-playwright-agent`, and `docs/src/docker.md` line 8 says so), so the package has to reach the container some other way.

## Decisions
### D-001: Four browser words, elements named by literal visible text
**Decision:** The closed list gains `open {<service>}<path>`, `fill "<label>" with "<value>"`, `click "<name>"` and `see "<text>"`; quoted parts are JSON strings, as in `expect contains`. `fill` acts on the one field whose label is exactly `<label>`; `click` on the one button or link whose accessible name is exactly `<name>`, or else the one element whose visible text is exactly `<name>`; `see` passes when a visible element holds `<text>`. Each waits up to the step timeout; zero or several matches fail and name the count. `fill`, `click` and `see` before any `open` is a parse problem. The grammar has no selector slot, and the driver passes names only to Playwright's label, role and text lookups, so a selector string matches only an element that shows that text. Cards stay `format: 1`: every existing card reads the same, and an older Picket meeting a new word fails with its name, as draft section 3.1 intends.
**Instead of:** Playwright selector strings such as `role=button[name="Sign in"]`: a selector is a small language inside the card, which the request rules out.
**Risks:**
- **RISK-001** A page with two buttons named "Save" cannot be clicked by name. Mitigation: the failure names the count, and the tester records the cell not covered with that reason.

### D-002: One adapter contract, one browser session per attempt
**Decision:** `src/lib/shared/scenarios/browser.mts` holds `BrowserAdapter = (command: BrowserCommand) => Promise<BrowserAnswer>`, shaped like `HttpAdapter` (`http.mts:3`): one function that never throws. `BrowserCommand` is `{ session, word: "open", url }`, `{ session, word: "fill", label, value }`, `{ session, word: "click", name }`, `{ session, word: "see", text }` or `{ session, word: "close" }`, each with `timeoutMs`; `BrowserAnswer` is `{ ok: true | false | null, detail }`, where `null` means no answer (blocked) and `false` a failed check. `browserAdapter(http, driver)` sends each command as one JSON POST to `<driver>/__picket/step` through the HTTP adapter; with `driver` null it answers `ok: null`, "the environment has no browser service", and sends nothing. The runner resolves placeholders, turns `{web}/login` into `pages.web` plus the path, where `pages` maps each service to its in-network address `http://<service>:<first port target>` (the browser runs inside the stack network, which the host URLs in `urls` do not reach), uses the attempt's run key as the session, and sends `close` once after an attempt that sent any browser command. A mixed card runs whole in one runner; `expect` and `capture` keep reading the last HTTP answer. The mock flag, compare and keep need no browser code: `replay.mts:58-60` reads stub traffic around each attempt whoever caused it, `compare.mts` classifies outcomes, and keep writes cards through `writeScenario`.
**Instead of:** a session object the runner opens and closes: two adapter shapes, and browser life cycles inside the runner.
**Risks:**
- **RISK-002** A click that submits a form changes data the kernel cannot see when it keeps a card, since `writesUnownedData` reads request steps only (`keep.mts:94-97`). Mitigation: phase 3 tells the tester to submit only `PKT-{run}` values; the review reads kept browser cards.

### D-003: Playwright runs in a browser service the project declares
**Decision:** `ROLES` (`standard.mts:8`) gains `browser`. A project that wants browser steps adds one service with that role and the Playwright image pinned by digest, which E6 already demands. Picket overlays it as it overlays a stubbed mock (`stub.mts:59-83`): command `node /picket/driver.mjs`, a read-only bind of the driver program and one of the vendored package at `/picket/node_modules/playwright-core`, a `--health` healthcheck, one container port whose host port the engine picks, `init: true` and `ipc: host` (`docs/src/docker.md` lines 101 and 103 recommend both). The driver, `src/lib/shared/browser/driver.mjs`, plain `.mjs` like `stub-server.mjs`, launches Chromium on its first command, keeps one context and page per session, and closes it on `close`. Rule E15 refuses a browser image whose tag is not `:v<PLAYWRIGHT_VERSION>-`, a second browser service, and a browser service with `build`. `browser` stays out of `LONG_RUNNING`, because Picket supplies its healthcheck. A project with no browser service pulls nothing, and its browser steps are blocked.
**Instead of:** Picket adding a browser service to every stack: every project, HTTP only included, would pull the Playwright image on each start.
**Risks:**
- **RISK-003** The image runs as root, so Chromium's sandbox is off (`docs/src/docker.md` line 38). Mitigation: rule 1 lets a page open only services of the environment.
- **RISK-004** Rootless Podman on the development machine may refuse Compose stacks, and the image is large, so no live run is in this item's own checks. Mitigation: T-2.8 is deferred to the release QA pass.

### D-004: playwright-core vendored at build, one version for package and image
**Decision:** `playwright-core` becomes an exact devDependency `1.65.1` (npm lists no dependencies for it; licence Apache-2.0). `scripts/build.mjs` copies `node_modules/playwright-core` whole, licence files included, to `dist/lib/vendor/playwright-core` and fails naming it when it is missing; the kernel copies that folder once per version into the state folder and binds it read-only, as it copies `stub-server.mjs`. The host never imports it. `PLAYWRIGHT_VERSION` in `src/lib/shared/browser/service.mts` is the one version: tests pin `package.json` and the vendored copy to it, and E15 pins the image tag. An upgrade bumps the devDependency and the constant, and E15 then names each project's image line.
**Instead of:** `npm install` inside the container at start: network on every fresh container, and no version Picket holds. A runtime dependency lost too: whether a plugin installed from an npm source gets its dependencies is unverified.
**Risks:**
- **RISK-005** Every install grows by the package, browser or not; npm reports 13971424 bytes unpacked for 1.65.1. Mitigation: OQ-001.

### D-005: Line budgets from landed counts
**Decision:** `budgets.test.mjs` adds `browser_adapter_lines` for `scenarios/browser.mts` and `browser_driver_lines` for `browser/driver.mjs`, and raises `scenario_core_lines`, which the base already fills to 574 of 600 by the test's own count (292, 106, 62 and 114 lines). Each number is the file's landed line count rounded up to the next 50, with that rationale beside it, as at `budgets.test.mjs:22-23`.
**Instead of:** fixed numbers now: no landed count exists yet to derive them from.

## Scope
**In:**
- The words `open`, `fill`, `click`, `see` in the card format, its rules and the runner; mixed cards
- The browser adapter contract, its HTTP client and the in-container driver, each with a line budget
- The `browser` role, rule E15, the overlay, the vendored package
- Replay, affected selection, compare, keep and the mock flag for browser cards
- The testing skill's case step for the new words

**Out:**
- Playwright test files, selectors, scripts, conditions or loops in a card
- Screenshots or visual comparison; a browser on the host
- Browser words in catalog entries (refused) and in declared checks
- `picket env init` proposing a browser service; the sandbox spike (SDR 00005 TF-003); the setting `testing`

## Phase 1: Browser words in the card, the rules and the runner
**Touch set:**
- `src/lib/shared/scenarios/format.mts`: step types, parse, write
- `src/lib/shared/scenarios/format.test.mts`: grammar round trip
- `src/lib/shared/scenarios/rules.mts`: rule 1, rule 3, secrets
- `src/lib/shared/scenarios/rules.test.mts`: rule problems
- `src/lib/shared/scenarios/rules.variants.test.mts`: closure seeds for fill
- `test/support/variants.mts` [INFERRED]: label grammar if none fits
- `src/lib/shared/scenarios/runner.mts`: dispatch browser steps
- `src/lib/shared/scenarios/runner.test.mts`: mixed card runs
- `src/lib/shared/scenarios/browser.mts`: contract and HTTP client
- `src/lib/shared/scenarios/browser.test.mts`: adapter mapping
- `src/lib/shared/scenarios/replay.mts`: pass browser, affected targets
- `src/lib/shared/scenarios/replay.test.mts`: affected and mock flag
- `src/lib/shared/scenarios/base-run.mts`: pass no browser yet
- `src/lib/shared/catalog/entry.mts`: refuse browser words
- `src/lib/shared/catalog/entry.test.mts`: entry refusal
- `src/lib/shared/catalog/resolve.mts`: data refs in browser steps
- `src/lib/shared/catalog/resolve.test.mts`: browser-only data ref resolves
- `src/lib/shared/testing/cases.mts`: pass no browser yet
- `src/lib/shared/testing/keep-cases.test.mts`: browser case kept
- `src/lib/verbs/env/replay.mts`: pass no browser yet
- `test/timing/budgets.test.mjs`: core and adapter budgets
- `test/fixtures/env/browser-card/.picket/env/compose.yaml`: fixture service
- `test/fixtures/env/browser-card/.picket/env/scenarios/S-0001.md`: fixture card

**Changes:** `STEP_WORDS` gains the four words with step types `OpenStep { target }`, `FillStep { label, value }`, `ClickStep { name }`, `SeeStep { text }`, each with `word` and `line`; `readStep` parses them, refuses `fill`, `click` or `see` before any `open` with `<word> comes before any open`, and `stepLines` writes them back. `rules.mts` applies rule 1 to `open` (`rule 1: step N opens <target>; a page opens only {<service>} of the environment`, or the unknown-service message), rule 3 and the fixed-date check to every text of a browser step, and refuses a literal value in a `fill` whose label `isSecretName` matches once spaces and dashes are removed: `step N: fill "<label>" holds a literal secret; ` followed by `SECRET_SOURCE`. The closure test adds seeds for that check over `SECRET_WORDS`. `browser.mts` lands the D-002 types and `browserAdapter`. `RunInput` and replay's `ReplayInput` gain `browser: BrowserAdapter` and `pages: Record<string, string>`; `BaseInput.replay` omits both. Until phase 2, `env/replay.mts`, `base-run.mts` and `cases.mts` pass `browserAdapter(adapter, null)` and `{}`. `targetServices` in `replay.mts` also reads `open` targets. A catalog entry with a browser word gives `step N: an entry uses only request, expect, capture and wait`. `stepTexts` in `resolve.mts` (lines 18-22) reads only request and expect texts, so `dataRefs` misses a `{data:<entry>.<capture>}` that appears only in a browser step: env check passes it and the run blocks with `{data:...} has no value`. It reads every text of the four browser steps too. The fixture holds a `web` dependency and the card `open https://example.com/login`, `fill "Password" with "hunter2"`, `click "Sign in"`, `see "Welcome"`; on the base its env check prints `unknown step word` for all four lines (captured 2026-11-20).

**Done when:**
- **T-1.1** In `format.test.mts`, the card `open {web}/login`, `fill "Email" with "PKT-{run}@example.com"`, `click "Sign in"`, `see "Welcome PKT-{run}"` parses into four steps with every field asserted and `writeScenario` writes it back byte for byte; `click "x"` before any `open` gives `step 1: click comes before any open`; `fill "Email"` without `with` gives a `step N:` problem naming `fill`; an unknown word still gives `unknown step word "<word>"`.
- **T-1.2** In `rules.test.mts`, `open https://example.com/x` gives the rule 1 message above, `open {nope}/` the unknown-service message, `see "{secret}"` a rule 3 problem, `fill "Due" with "2026-01-02"` the fixed-date problem, and `fill "Password" with "hunter2"` the literal-secret problem, while `fill "Password" with "{user:buyer.password}"` gives none; the closure test for `scenarioProblems` passes with the new seeds.
- **T-1.3** In `runner.test.mts`, a mixed card (request, capture, open with the captured value in its path, fill, click, see, request, expect) run with fake HTTP and browser adapters passes, and the browser adapter receives the four commands in card order with `url` equal to `pages.web` plus the resolved path, one session equal to the run key, then one `close`; `ok: false` gives `failed` with `step N: <detail>`, `ok: null` gives `blocked`, and a card with no browser step sends no browser command.
- **T-1.4** In `browser.test.mts`, `browserAdapter` over a fake HTTP adapter POSTs each command as JSON to `<driver>/__picket/step` and maps a 200 answer `{ ok, detail }` to the same answer; another status, an unreadable body or no answer gives `ok: null` with the cause; with `driver` null every command gives `ok: null`, "the environment has no browser service", and no request is sent.
- **T-1.5** In `replay.test.mts`, `affected` selects a card whose only service is an `open` target when that app changed, and a browser card during which a stub's received list grows has that stub in `mocks`; in `keep-cases.test.mts`, a passed case row with browser steps becomes a candidate whose text parses back to the same steps.
- **T-1.6** In `entry.test.mts`, an entry with an `open` step gives `step N: an entry uses only request, expect, capture and wait`; in `resolve.test.mts`, `dataRefs` of a card whose only `{data:customer.email}` sits in a `fill` value returns `customer`, and `resolveData` runs that entry and returns its captures.
- **T-1.7** `env check` on `test/fixtures/env/browser-card` exits 2 and prints `E11 S-0001: rule 1: step 1 opens https://example.com/login` and the literal-secret line for step 2.
- **T-1.8** `budgets.test.mjs` holds `scenario_core_lines` and `browser_adapter_lines` at the landed counts rounded up to the next 50, each with its rationale; `git diff ce44e826 -- src/lib/shared/scenarios/format.test.mts src/lib/shared/scenarios/runner.test.mts src/lib/shared/scenarios/rules.test.mts` removes no line except, in `format.test.mts`, the `STEP_WORDS` assertion, which gains the four browser words, and the unknown-step-word example, which takes a word still unknown (before-image: those files at the base); `npm test` passes.

## Phase 2: The browser service, its driver and the vendored package
**Touch set:**
- `src/lib/shared/env/standard.mts`: add the browser role
- `src/lib/shared/env/rules.mts`: rule E15
- `src/lib/shared/env/rules.test.mts`: E1, E3, E15 cases
- `src/lib/shared/browser/service.mts`: version, overlay, ports, pages
- `src/lib/shared/browser/service.test.mts`: overlay and version pins
- `src/lib/shared/browser/driver.mjs`: in-container step server
- `src/lib/shared/browser/driver.test.mts`: actions and round trip
- `src/lib/verbs/env/start.mts`: overlay, driver endpoint
- `src/lib/shared/env/trial.mts`: overlay in the trial stack
- `src/lib/shared/scenarios/base-run.mts`: overlay, driver, pages
- `src/lib/shared/testing/cases.mts`: driver and pages for cases
- `src/lib/shared/testing/cases.test.mts`: stack facts
- `src/lib/verbs/env/replay.mts`: driver and pages for replay
- `scripts/build.mjs`: copy the package to dist
- `package.json`: exact devDependency
- `package-lock.json`: lock the devDependency
- `test/timing/budgets.test.mjs`: driver budget
- `test/repo/package.test.mjs`: vendored package ships
- `test/fixtures/env/browser/.picket/env/compose.yaml`: wrong-version fixture

**Changes:** `service.mts` exports `PLAYWRIGHT_VERSION = "1.65.1"`, the overlay fragment of D-003 for the one `browser` service (merged into the map `overrideDoc` already takes, at `start.mts:72`, `trial.mts:61` and `base-run.mts:125`), the port step that `withStubPorts` does for stubs, and `pagesOf(services)`. `stackOf` in `cases.mts`, `replayStack` in `env/replay.mts` and `startAndReplay` in `base-run.mts` replace phase 1's null driver with the browser service's endpoint and `{}` with `pagesOf`. `driver.mjs` exports `act(page, command)` and `startDriver({ host, port, launch })`, answers `POST /__picket/step` and `GET /__picket/health`, takes `--health` like the stub, and imports `playwright-core` only in `main`, so host tests inject a fake `launch`. `open` answering 400 or more fails with the status; a step for a session with no page fails with "no page open". The fixture declares `browser` with `mcr.microsoft.com/playwright:v1.50.0-noble` pinned by a digest; on the base its env check prints `E1 browser: label ... must be one of app, dependency, mock, data, seed` (captured 2026-11-20).

**Done when:**
- **T-2.1** In `rules.test.mts`, E1 accepts role `browser`; E15 fires for an image tagged `:v1.50.0-noble`, for a second browser service and for a browser service with `build`, and stays silent for `:v1.65.1-noble@sha256:<digest>`; E3 is silent for a browser service with no healthcheck.
- **T-2.2** In `service.test.mts`, the fragment holds the driver command, exactly two binds, both `read_only: true` with targets `/picket/driver.mjs` and `/picket/node_modules/playwright-core`, the `--health` check, one port with no published port, `init: true` and `ipc: host`; `pagesOf` maps `web` with port 3000 to `http://web:3000`; `git diff ce44e826 -- src/lib/shared/env/build-plan.test.mts` is empty and that test passes, so an environment without a browser service gets the base override (before-image: that file at the base).
- **T-2.3** In `driver.test.mts` with a fake page, `fill` uses the label lookup with exact match, `click` the button or link lookup and then exact text, `see` the text lookup; zero or two matches give `ok: false` naming the count; `close` closes that session's context only; `budgets.test.mjs` holds `browser_driver_lines` at its landed count rounded up to the next 50.
- **T-2.4** In `driver.test.mts`, `startDriver` on 127.0.0.1 port 0 with a fake `launch`, reached by `browserAdapter` over the real `httpAdapter`, runs a mixed card through `runScenario` to `passed`, and a missing label arrives as `failed` with the driver's detail unchanged.
- **T-2.5** In `cases.test.mts`, a stack with a browser service gives the runner that service's endpoint as driver and in-network pages; one without gives a blocked browser step with "the environment has no browser service".
- **T-2.6** After `npm run build`, `dist/lib/vendor/playwright-core/package.json` has version `PLAYWRIGHT_VERSION`, as does the devDependency in `package.json` (`service.test.mts`), and `package.test.mjs` finds `lib/vendor/playwright-core/package.json` and `lib/vendor/playwright-core/LICENSE` in the tarball; `npm test` passes.
- **T-2.7** `env check` on `test/fixtures/env/browser` exits 2 with an `E15 browser:` line naming the v1.50.0 image and `v1.65.1`.
- **T-2.8** [DEFERRED: QA, the release QA pass] On Docker or Podman, `picket env start` on a project with a browser service brings the driver up healthy, and `picket env replay <id> --only <S-id>` passes a mixed card against a sample page with a labelled form.

## Phase 3: The testing skill's case step for browser words
**Touch set:**
- `src/skills/testing/steps/cases.md`: words, example, failure lines
- `src/lib/verbs/test/skill-examples.test.mts`: parse the example cards

**Changes:** Step 3 lists `open {<service>}<path>`, `fill "<label>" with "<value>"`, `click "<name>"` and `see "<text>"`, says to name an element by the label or text a user sees and never by a selector, and to use them when a criterion names what a user sees. Step 4 adds that a value a browser case submits carries `PKT-{run}`. A fenced mixed example logs in by request, opens a page, fills, clicks and sees. Step 7 reads the browser failure lines (a missing label, a match count, text not seen) and the blocked line "the environment has no browser service", which is recorded as not covered with that reason. `skill-examples.test.mts` runs every fenced block of `cases.md` that starts with a step word through `caseCard`.

**Done when:**
- **T-3.1** `cases.md` step 3 lists the four browser words in the forms above and forbids selectors.
- **T-3.2** `cases.md` holds a fenced example with `request`, `open`, `fill`, `click` and `see` lines, and step 4 names `PKT-{run}` for submitted values.
- **T-3.3** `skill-examples.test.mts` parses each such block of `cases.md` through `caseCard` with no problems and fails when a block holds an unknown word.
- **T-3.4** `cases.md` stays within the 80-line step budget and `npm test` passes.

## Open questions
- **OQ-001** The vendored package adds 13971424 bytes unpacked (npm's figure for 1.65.1) to every install, including projects with no browser service. Is that acceptable for the alpha, or should the package come from a one-time download the user confirms? Owner: product owner. Fallback: vendor as D-004 says.

## Revision log
- 2026-11-20: T-1.8: the STEP_WORDS assertion and the unknown-word example in format.test.mts may change; the user's ruling, since both pinned the old closed list.
- 2026-11-20: T-1.6, phase 1 touch set: resolve.mts reads browser step texts for data refs; a browser-only {data:} ref passed env check but blocked at run time.
