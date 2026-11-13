# Working notes: the tester, saved scenarios and the standard test environment

**Status:** Draft. Not an SDR, not ratified, nothing built.
**Dates:** consultations of 2026-10-21, 2026-10-22, 2026-11-12 and 2026-11-13 (three interview rounds, two research reports, one cross-check).
**This version:** consolidated on 2026-11-13. It states only what stands now. Earlier versions are in the git history of this file.

## Goal

A minimal verification inside the delivery flow: the implementation does what the initial request asked, and it breaks nothing that already exists. Everything a QA department does beyond that (exploratory testing, performance, security catalogues, manual testing) stays with the QA team.

Main driver for this whole area: ease of change. Picket owns the formats and uses engines underneath; nothing here may grow into a test framework.

## Terms

- **Declared check**: a request with its expected result that the architect writes in a phase of the plan. Formerly "declared hit".
- **Scenario**: a saved test: a card in words over recorded steps.
- **Flow**: a named path through the system; a label on scenarios. Never "journey".
- **Mock**: a stand-in for a service. Never "fake".
- **Normal** (case kind): the ordinary case works. **Smoke**: the quick read-only set. The two are different things.
- **Environment**: the standard test system under `.picket/env/`.

## 1. Declared checks

- The architect writes checks in a phase's `drive:` frontmatter. A check asserts method, path, expected status and an optional `contains` list of literal strings, and names the criterion it belongs to (`covers`). A CLI or worker phase declares a run: command, exit code, `contains`.
- `picket verify` runs them at the phase gate. A mismatch is ruled on by the user at that gate, never sent to the architect as drift on its own.
- Under a run grant, a path prefix difference is carried (the path that ran ends with the declared path; method, status and `contains` hold). A failed status or `contains`, a different resource, or any difference in a run command stops the run at that phase.
- Carried mismatches appear once, as a group. The normal approval accepts them, and the kernel writes the correction with a revision log line, with no architect turn. A security phase keeps its own gate.
- Where the check runs: the developer uses `picket drive` to try things while coding. In a project with the environment, the check that counts at the gate runs on the environment, and the packet names the runtime. A project without the environment keeps drive for the gate check.
- When the user approves the phase, the kernel keeps the check as a saved scenario (in a project with the environment). The architect names no flow.
- A deliberate change of tested behaviour is known at planning time: the architect names in the plan which saved scenarios the item replaces, and the user confirms that at the phase gate.

Today's gap, for reference: `driveResult` in `src/lib/verbs/verify/index.mts` passes when any drive-class row exists, reads no status, and counts rows with no work item or phase.

## 2. The standard test environment

### 2.1 Shape

- One enforced standard on the Compose Specification, run by Docker or Podman. No Kubernetes.
- Tracked layout at the umbrella root: `.picket/env/compose.yaml`, `mocks/`, `scenarios/`, `catalog.yaml`, `data/` (SQL files), `docker/` (generated Dockerfiles), and `seed/` where a project can have one.
- Service roles: `app` (built from source, the code under test), `dependency` (a ready image, pinned), `mock`, `shared` (not started by the stack, reached by address, long-lived and used by others, such as a legacy database), `data` (the database's own command-line client, which runs approved SQL files), and `seed` (optional).
- Situation supported: the item's code is built from source and started for the test; only data and some dependencies are long-lived. Testing against a deployed environment is not supported in the first version.
- A service that cannot be built is run as a ready image, used as a `shared` instance, or as a last resort replaced by a mock.

### 2.2 Rules checked by `picket env check`

- every service carries a role label;
- an `app` uses `build:`, never a pulled image, and its image is proven to be built from the commit under test;
- every long-running service has a healthcheck;
- no fixed host ports;
- state of services the stack starts lives in named volumes;
- `dependency` and `mock` images are pinned;
- a trial start passes twice in a row;
- the environment is in step with the code: no service, outside host or address-like configuration entry exists without a decision.

A phase that adds or removes a service, or adds an address-like configuration entry, fails verify until `.picket/env/` is in step, so the change to the environment travels in the item that changes the system. A difference the item did not cause is a packet line, not a failure. Defaults inside an item: a new service is an `app`, a new outside host is a mock, both listed in a group at the gate.

### 2.3 Machines

- Docker or Podman with Compose version 2, Linux containers only. Linux and macOS directly, Windows through WSL2. Windows containers are not supported; a service that needs one is a `shared` instance or a mock. The user's developers are mostly on Windows.
- The check of the operating system and the requirements runs first, on every machine, before the setup does anything. When a requirement is missing, the setup stops, says what to install, and writes nothing. Low memory or disk is a warning, never a block.

### 2.4 Setup and updates: `picket env init`

One verb for the first install and for every update. It writes no environment files itself. It does four things:

1. Checks the machine (2.3).
2. Scans the umbrella for services, existing Dockerfiles, and everything configuration related (`web.config`, `appsettings*.json`, `config.json` and the like), and lists the address-like entries with secret values masked.
3. Decides with the user, one by one: for each service whether an existing Dockerfile is used, Picket writes one, or the user fills it in; for each configuration entry whether it is set by environment variable (the default), through a replaced configuration file, or left as it is.
4. Creates a work item whose request lists every step explicitly, from those decisions: the Compose file with Picket's plumbing, each Dockerfile, each wiring entry, each mock, and `picket env check` passing. The work then goes through the normal lanes with the user's gates.

An update runs the same scan, compares it with the environment, and creates a smaller item for the difference. Parts the user chose to fill in are listed in the item as left to the user, and `picket env check` names them until they are complete.

A service's own Dockerfile is used where one exists. Anything written for Picket lives under `.picket/env/docker/<service>/`, never inside the service's repository.

### 2.5 Wiring

- An app takes the addresses of other services from outside itself. Environment variables are the default; a replaced configuration file is allowed where a service cannot take variables.
- For a replaced file, only the changed entries are stored and the file is built from the checked-in original at start where the format allows it. Otherwise a full copy is kept, and `picket env check` reports settings the original has and the copy lacks.
- No secret value is written under `.picket/env/`, only the name of the variable that holds it.

### 2.6 Mocks

- Picket's own small definition format and a tiny stub server that Picket provides. No outside mock product.
- A definition names the service it replaces, the source of its answers (a response recorded from the real service on a date, or the service's API description), and a list of "when this request, respond with that".
- The stub answers fixed responses and logs what it received; a scenario reads that log with a normal request. No scripting, conditions or state. A request with no answer gives a clear error, reported as a gap in the mock and never as a product defect.
- A project may bring its own mock container with the role `mock`, by its own choice.
- Every result that passed through a mock is flagged, at three levels: on the result, on the flow ("verified up to X, which is mocked"), and on the item's closing line, which also names the real services no test reached ("Not verified end to end: X"). A pass through a mock is never read as proof that the full flow works.

### 2.7 Umbrella and builds

- Picket runs at the umbrella's root, so every service inside it is reachable. The environment and the scenarios live there: one suite for the system.
- A service the item changes is built from the item's worktree. A service the item does not change is built from the version checked out at the root. The report names the commit of each.
- A service outside the umbrella is a dependency (ready image, `shared` instance or mock), never built by Picket. A project may point a build at a Dockerfile outside the umbrella by its own choice; Picket does not design for that.

### 2.8 Names

| Thing | Convention | Example |
|---|---|---|
| A service | its folder name, lower case with hyphens | `billing` |
| The service in a scenario | the name in braces | `{billing}` |
| The service's address for tools | `PICKET_URL_<SERVICE>` | `PICKET_URL_BILLING` |
| A mock | the name of what it replaces plus `-mock` | `payments-mock` |
| A built image | `picket/<service>-<item>:<commit>` | `picket/billing-proj-481:4f2a91c` |
| A test record | `PKT-<run key>-<what>` | `PKT-7f3a-customer` |
| A scenario | `S-` plus a number, never reused | `S-0044` |
| A defect | `DF-` plus a number, unique in the project | `DF-0012` |

`<item>` is the Jira key in lower case when the item has one, otherwise the four-letter item tag. The commit as the image version separates the item's build from the build at the base commit.

### 2.9 Lifecycle

- A stack is started only when a verb needs it (the gate check, a replay, the tester), never at resume.
- When a session ends, a hook stops the stacks of that session's items: memory is freed and state is kept. Because a hook does not run after a crash, the next session start stops any stack whose session is gone.
- `picket close` removes, by a label carrying the item's id, the item's containers, network, volumes and built images. It does not remove `shared` services, the build cache, or test records in a shared database.
- `picket env status` lists stacks whose item is closed, abandoned or unknown, and the session start warns about them.

## 3. Saved scenarios

### 3.1 Format

- A card in words over recorded steps. Header: `id`, `kind`, `covers`, `intent`, and optionally `flow`, `defect`, `known`, `supersedes`, `status`. The kernel counts and filters by the labels and never parses `intent`.
- Step words are a closed list: `request`, `expect`, `capture`, `wait`; for the browser later `open`, `fill`, `click`, `see`, with elements named by what the user sees.
- Login, mock checks and data variations are plain requests, not keywords. No conditions, loops or includes, ever.
- Engines sit behind adapters: HTTP (Node's `fetch`), browser (Playwright from a pinned container, later), command (only for the architect's check of a CLI phase).
- Kept light by rules that code checks: a line budget for each adapter and for the core, `format: 1` on each card, an unknown word fails with its name, and a format change is handled by recording again from `intent`, never by a migration script.
- A flow is a label and is optional until the tester sorts an item's scenarios.

### 3.2 How a scenario is written

- The kernel writes it, never the tester. The tester sends each step through one command (`picket env step`); the kernel sends it and logs it; the tester names the logged steps to save.
- Before a file is kept, the kernel replays the new scenario once from the start on its own. Only a passing replay is saved. A saved scenario is therefore always something that ran and passed.
- Fixed dates are refused in favour of relative ones. A captured secret or personal value is stored by name, never by value.
- A scenario that passes in one order and fails in another is not saved.
- Kept only if it covers a criterion or reproduced a defect. The smoke set is one read-only scenario per flow, status and shape only, with a time cap.
- A scenario for new behaviour that also passes on the base commit proves nothing about the change, and is flagged.

### 3.3 What a scenario may do

Checked by the kernel before it runs a file:

1. A request goes only to a service of the environment named by its placeholder, never to a full address.
2. A saved scenario has no command steps.
3. A value comes only from the scenario's captures, the run key, the data catalog or a named test user, never from an arbitrary environment variable.

Responses seen during a test are untrusted content for the tester, under the existing rule.

### 3.4 Data: shared and long-lived by default

A fresh seed for every run is not realistic for many systems. Every scenario is written as if the data is shared, old and changed by others. A fresh seed is a bonus where a project can have one, and scenarios are written the same way in both cases.

- A scenario never names a fixed record. It creates its data, finds a fitting record, or takes one from the catalog.
- It checks only what it owns or a change, never a total.
- It writes only to records it created; shared records are read-only. The kernel checks at save time that a changing step uses an id an earlier step of the same scenario created.
- Everything created carries the `PKT-` prefix with the run key.
- Missing data is "blocked: no matching data", never a failure. Before a run the kernel checks that catalog records still exist and reports a missing one as data drift.

### 3.5 The data catalog

`.picket/env/catalog.yaml`. Each entry names a data need and how to satisfy it:

| Kind | Meaning |
|---|---|
| `create` | steps through the product's API, with the run key |
| `find` | a lookup step that picks a fitting record |
| `fixed` | a known record, how it was produced, checked before each run |
| `user` | a test user for a role, its secret by variable name |
| `sql` | an approved SQL file, where no endpoint can produce the data |

Entry steps use the scenario's step words. The catalog grows from the tester's proposals (saved only after a replay), from the user's answers at a "blocked for lack of data" stop, and by hand.

### 3.6 Data through the database, first version

- The kernel runs a SQL file. An agent never writes a query while running.
- The developer enters the connection string by hand. It is held in an environment variable and never written to a tracked file, a report or a log.
- The file is run by the database's own command-line client in a container (the `data` service), so Picket carries no database driver.
- The user approves each SQL file once, in full. A changed file is not run until approved again.
- Deferred to a follow-up item: a named test target with no address on the command line, a deny list of production hosts, a marker inside the database that only test databases hold, a write account that exists only on the test database, a declared row limit with rollback, and a text check that refuses destructive statements.

### 3.7 Login

A scenario logs in as its first step, by the first way that works for the project: (1) the product's own login with test users, (2) a mock identity provider in the stack, (3) a dedicated test account on the real identity provider. One test user for each role the permission checks need. A login that needs a person gives "blocked: needs a person". A failure of an outside identity provider is an environment problem, never a defect.

### 3.8 Replay and the baseline

- The kernel replays scenarios with no model. Scenarios run inside Picket sessions only; there is no pipeline integration, because the CLI lives in the plugin (SDR 00001, SDR 00003).
- The kernel keeps the last known result of each scenario with the commits it ran on. An item compares its results with the results for its base; the system is built and replayed at the base only when no stored result exists for those commits.
- A scenario already failing at the base is reported as failing before the item, and is not blamed on it. The kernel counts how often that happens; a pipeline option is reconsidered only if the count is high.
- Each result names the commit it ran on. Results from before a fix do not count for the commit after it. A single scenario replayed during a fix is kept apart from full runs.

### 3.9 Replacing and changing scenarios

- A scenario replaced on purpose is never rewritten: the old one gets `status: deprecated` and `superseded_by`, the new one `supersedes`. Ids are never reused, files never deleted.
- Nothing is replaced by an agent without the user's approval. A replacement names the criterion that contradicts the old intent. The architect names foreseen replacements in the plan; the tester proposes unforeseen ones, and they go to the user's stop.
- A scenario changed by hand is the person's own choice. The kernel notices the change by its fingerprint, checks the rules of 3.3, replays it, and gives notice that it was changed by hand. Once accepted it is the normal version from then on.
- Setting `scenarios.supersede: gate | close`, default `gate`; the ledger counts approvals and refusals so the gate can be removed on data.

### 3.10 Known defects

- A defect outside the item's criteria, or one that the base shows too, does not block the item. It is recorded as a known defect and offered as a ticket through `picket:ticketing`, with the user's confirmation.
- Its scenario asserts the correct behaviour and carries `known: DF-xxxx`. Its failure does not count against an item or trip the breaker. Every regression run prints the open known defects with their age.
- When a known defect stops failing, the reason is stated:
  - it passes at the base too: fixed outside this item; the commit range since its last failing run is reported;
  - it fails at the base, passes on the item, and the item names it: fixed by this item on purpose;
  - it fails at the base, passes on the item, and the item does not name it: a side effect; the label stays and the case goes to the user's stop with the files that changed;
  - the item changed a mock, the catalog or the scenario's inputs: possibly masked; treated as the side-effect case.

## 4. The tester

### 4.1 When and what

- A fifth agent, `tester`, with the skill `picket:testing`. It runs after the cumulative review ends with `APPROVED`, on order and design items in which a phase declares a check. Never in the fast lane. Config: `testing: all | design | off`.
- It requires the environment. A project without one gets `Tested: no environment` at close.
- It reuses three verdict tokens and adds none: `APPROVED`, `CHANGES REQUIRED`, and `DRIFT DETECTED` for a criterion that cannot be tested as written (the architect amends, ends with `AMENDED`, the tester retests).
- It is a black box toward the change: the guard denies it reads of the files the item changed. It may read the rest of the project. It edits no product code and no tests.

### 4.2 What it knows

- The kernel compiles the brief: the story, the criteria, the approved checks, the start facts, the project's suites. The send carries no diff.
- A request's shape comes from four sources in order: (1) the API description the running system publishes; (2) the item's approved checks; (3) saved scenarios of earlier items; (4) the analyst reads the code and returns names and types only, in a closed shape a lint checks, delivered through the kernel. No sixth agent; each use of source 4 is counted. When all four are silent, a rejected attempt is "not covered: request shape unknown", never a defect.

### 4.3 Method

- A matrix: for each criterion the case kinds normal, boundary, negative, permission, state, integration.
- Sized by "one risk, one check": no scenario where an approved check or a saved scenario already covers it, "not applicable" where the kind does not exist for the criterion, and a cap by item size. What falls outside the cap is listed as not covered.
- Permission checks go both ways: where the credential must work and where it must be refused.
- No exploratory testing.

### 4.4 Results and the verdict

- Each cell is passed, failed, blocked, not run or not covered. None is rounded up to a pass. These are data in the report, not verdict tokens.
- Every failure is first classified as product, test or environment, with evidence. On a dispute the kernel replays the scenario and the reviewer, who may read the code, rules whether the test or the product is wrong.
- Code derives the verdict from the table, and each cell that needs action goes to an existing route: developer fix, architect amendment, item block, or the user's stop.
- `APPROVED` is impossible while a criterion has no passed check of its own.
- Every finding needs runtime evidence. Environment trouble is reported apart from functional results.
- The kernel generates `work/<id>/test.md` from the recorded results and the tester's table rows. The tester writes no report prose that carries a number.

### 4.5 Questions

- When the story is silent the tester asks; it neither guesses nor files a defect. At most three questions per item, on business matters only, each phrased as a choice.
- A default must rest on a fact. It carries a `Basis:` line, from these sources in order: the story and its criteria, the record's decisions, an API description, the behaviour at the base, and a saved scenario last. With no basis the question is asked with no default.

## 5. Fix rounds, stops and the circuit breaker

- A round: the developer fixes, the same reviewer re-reviews the fix diff, the same tester retests every scenario. No gate between rounds. Three failed rounds become the user's decision.
- A fix stays inside the item's touch set plus tests, as a phase does. A fix that needs product code outside it is an amendment: the architect adds the file with the reason, and the user approves the amendment. This replaces the breaker's earlier second signal.
- The breaker trips at once when a scenario that passed turns red. `picket:debugging` runs first; then one stop carries the facts, the cause and a red test, with the options design, one more fix round, consult or park, and the diagnosis chooses the default. A trip is counted at close.
- Most items see no stop in the test stage. When stops occur they come in this order:
  1. the user's stop: questions, unforeseen replacements, a known defect that stopped failing without explanation, the new behaviour blocked for lack of data (provide the data, or accept "approved, not verified: no data", recorded like a waiver);
  2. approval of a plan amendment;
  3. the fix rounds, which the breaker or the three-round limit can interrupt;
  4. approval of the fixes, only when code changed: it commits them as one commit, the same as in the development cycle.

## 6. The fast lane

- No tester. The fast lane replays the saved scenarios that call a service whose source the change touched, and compares with the last known results.
- A failure is fixed within the fast lane like a failing unit test.
- A change that is meant to alter tested behaviour leaves the fast lane for the order lane, which has the gate.

## 7. Learning

- Each defect keeps its entry after the fix, with scenario, expected, actual, evidence, root cause and `Escaped:`, a closed list: unit test, declared check, a review row id, or `none: not checkable earlier`.
- `picket close` counts escape points across items. At two or more, one line of prose goes to the memory of the role concerned and is listed in the closing summary. A project rule stays a change the user requests.

## 8. Measuring the tester

A planted-defect benchmark inside Picket's own repository, never in a user's project. The benchmark fixture grows to a small system in the environment. Each task holds a story, a ready implementation with a known mistake and a hidden answer key; trap tasks hold a correct implementation that looks suspicious; tasks with a silent story expect a question. Code grades the generated report against the key by request and status. It reports planted defects found, false alarms, questions asked rightly, cost, time and whether every run gave the same result. A change to the testing skill is kept only if the numbers are not worse. It also decides the default of `testing`.

## 9. Build order

Each step is one design-lane item in Picket's repository and is useful before the next starts.

1. Declared checks: `picket verify` checks status and content, with the mismatch rules. Needs no environment.
2. The environment: `.picket/env/`, the `picket env` verbs, the check rules, the setup that creates a work item, the fixture system.
3. Saved scenarios and replay: approved checks kept, kernel replay, stored results, the fast-lane replay, replacements named in the plan, the three safety rules. No new agent up to here.
4. The tester, with the planted-defect benchmark that judges it.

Afterwards, when wanted: the managed data catalog, known defects with their watching, the counted learning, the database guards, the browser adapter.

## 10. Defaults proposed by the lead, accepted by the user on 2026-11-13

- A failure counts only after a second run confirms it; a scenario that flips is marked unstable and kept out of the breaker.
- "Does not start" is a product defect when the base starts and the item's commit does not; otherwise it is an environment problem.
- A schema change against a `shared` database blocks the tester stage and goes to the user.
- The packet prints the server and database name, without the password, on each run that uses SQL.
- The commit also goes into the standard image label `org.opencontainers.image.revision`, and Picket's labels use a reverse-domain prefix.
- The stack's name follows the same `<item>` rule as the image name.
- `testing` ships as `design` until the benchmark has measured it.

## 11. Still to do or to verify

- Which of the user's real services can run in a Linux container. `web.config` in the user's examples suggests at least one cannot. Before build step 2.
- Which database the user's system uses; needed when the SQL part is designed.
- One question for the QA colleague: do QA staff edit test cases by hand?
- That Compose accepts a Dockerfile outside the build folder.
- Which session-end reasons the hook receives, so a `/clear` does not stop a stack still in use.
- Room in `.claude/MEMORY.md` for the new terms; the file is at its limit.
- The cap numbers for the matrix and limits on a tester session.

## 12. Rejected along the way

- A tester that writes tests before the developer implements, per phase.
- Automatic drift to the architect on a failed check.
- Test files written by the tester in the project's own stack; Playwright test files written by the tester.
- A tester that reads everything.
- Retest without a re-review of the fix; fixes committed without the user's approval.
- Debug as an option at the breaker stop, not before it.
- A breaker trip when a fix leaves the touch set.
- New verdict tokens for the tester.
- An existing runner or an existing mock product as the standard.
- A flow as a reusable step file.
- Exploratory testing in the tester's session.
- A setup that writes the environment files itself with no review; a separate update verb.
- A fresh seed or a reset as the default for test data.
- Ready-made tokens inserted by the kernel in place of a login.
- Running scenarios in a pipeline, through `npx` or headless Claude Code.
- A gate for a scenario a person changed by hand.
- One environment in each repository with every other service mocked.
- Windows containers; Kubernetes; testing against a deployed environment in the first version.
- From the QA colleague's practice: asserting the wrong behaviour on purpose, editing tests in place by tier, a fixed checklist found by a label, testers that read the source.

## 13. Sources

- `artifacts/reports/qa-colleague-workflow-testing-skill.md` and `artifacts/reports/qa-colleague-project-unread-rest.md`: the QA colleague's project, studied read-only; nothing from it is copied.
- `artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md` and `00003-mods-fold-picket-plugin.md`: where the CLI lives.
