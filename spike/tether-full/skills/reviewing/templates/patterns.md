# Template: General Patterns Checklist

**Always applied** alongside any concern-specific templates, or as the sole template when no concern matches.

These checks target universal correctness and maintainability principles. Skip any check silently if its target construct does not appear in the changed files.

---

## SOLID

| # | Principle | Check | Fail condition | Severity |
|---|-----------|-------|----------------|----------|
| S1 | Single Responsibility | Class or function has a single purpose | A class has more than one public concern (e.g., handles HTTP routing AND business logic AND persistence) without being a deliberate coordinator | Major |
| S2 | Open/Closed | Extend via polymorphism, not modification | A `switch` or `if-else` chain dispatches on a type discriminator where adding a new case requires modifying the chain — AND the project elsewhere uses the polymorphic pattern | Minor |
| S3 | Liskov Substitution | Subtypes honour base-type contracts | A method override throws `NotImplementedException`, `NotSupportedException`, or is left empty when the base defines observable behaviour | Critical |
| S4 | Interface Segregation | Interfaces are role-specific | A concrete class implements an interface but leaves one or more methods unimplemented (stub returning default/null/empty) | Major |
| S5 | Dependency Inversion | Depend on abstractions | High-level code (handler, service, controller) directly instantiates a low-level concrete type (database, file system, network) with `new` instead of injecting an interface | Major |

---

## DRY / duplication

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Dr1 | Copy-paste duplication | A block of 5 or more lines is duplicated verbatim (or near-verbatim with only variable names changed) in two or more places within the changed files | Major |
| Dr2 | Magic number | A numeric or string literal is used in logic (conditions, calculations, key names) without a named constant — AND the same literal appears more than once, or its meaning is not obvious from context alone | Minor |

---

## Correctness

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Co1 | Mutating input argument | A function modifies a reference-type argument that the caller passed in — without the parameter being explicitly named or documented as an output/in-out parameter | Critical |
| Co2 | Off-by-one in loops | A loop bound uses `<` vs `<=` or `>` vs `>=` in a way that would skip the last or first element — verifiable by tracing the index against the collection size | Critical |
| Co3 | Incorrect equality | Reference equality (`==` on objects, `ReferenceEquals`, `is` without pattern) used where value equality is intended for types that override `Equals` | Critical |
| Co4 | Mutable shared state | A `static` or module-level variable is written to by instance methods without synchronisation — in a context where concurrent access is possible | Critical |

---

## Security (universal)

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Se1 | Secret in source | A string literal that looks like a password, token, API key, or connection string is hard-coded in the changed files | Critical |
| Se2 | SQL / command injection | User-supplied input is concatenated into a SQL query string, shell command, or OS path without parameterisation or sanitisation | Critical |
| Se3 | Insecure default | Security-sensitive configuration (CORS wildcard `*`, `allowUnsafeEval`, `disableSSLVerification`, `DEBUG=true`) hard-coded to an insecure value in non-test code | Critical |

---

## Comment discipline

The developer's charter: comments are **scarce** and carry **WHY**. A comment that narrates mechanism is noise — the code already says what it does, and a comment explaining *what* should have been a better name or a smaller function. Judge the comments the diff **adds**; pre-existing comments are out of scope unless the diff changed the code beneath them and left the comment stale.

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Cm1 | Mechanism narration | An added comment describes what the code does rather than why (`// loop over the orders and sum them`, `// set the flag`, `// returns the total`) — the line beneath it says the same thing to any competent reader | Minor |
| Cm2 | Commented-out code | An added comment contains disabled code rather than prose | Minor |
| Cm3 | Comment instead of a name | An added comment exists to explain an identifier or a block that a rename or an extracted function would have made self-evident | Minor |
| Cm4 | Stale comment | The diff changed code beneath an existing comment and the comment now describes behaviour the code no longer has | **Major** |

**Aggregate, never enumerate.** Cm1–Cm3 across the whole diff are reported as **one** Minor finding listing each `file:line` and the offending text, so a comment-heavy phase consumes one slot of the `## Evidence bar` E5 Minor cap instead of burying every blocking finding. Cm4 is reported per occurrence — a comment that now lies is a correctness hazard, not a style preference.

**Exempt, never flagged:** doc comments on public API surface where the project's convention requires them (XML docs, JSDoc, docstrings, godoc); machine directives (`eslint-disable`, `@ts-expect-error`, `noqa`, `SuppressMessage`, pragmas) and their justification text; licence/SPDX headers; generated-file banners; and the workflow's own markers (`[IRREVERSIBLE]`, status anchors).

---

## Test scope

The developer authors **unit** tests and, conditionally, **architecture** tests. Every other kind is off unless explicitly unlocked — the binding rules, including what counts as an unlock, are `.claude/agents/assets/detectors.yaml#test_authoring_policy`. Judge tests the diff **adds**; a pre-existing suite of any kind is not a finding.

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Ts1 | Excluded test kind authored | The diff adds an integration, component, end-to-end, contract, performance/benchmark, or smoke test, and neither the phase summary nor the plan records an explicit unlock naming that kind | **Major** |
| Ts2 | Infrastructure in a unit test | An added test boots or reaches real infrastructure — DB provider, container, HTTP server, in-memory host, broker, filesystem — regardless of what the file is called | **Major** |
| Ts3 | Architecture harness introduced | The diff introduces an arch-test harness (NetArchTest, ArchUnit, ts-arch, dependency-cruiser) where the project had none — permitted only when the harness already exists | Minor |
| Ts4 | Test asserts nothing meaningful | An added test asserts only that a mock was called, or has no assertion on the business rule its name claims to cover | Major |

A plan line prescribing an excluded kind is **not** an unlock (`plan_conflict`): the developer should have covered the rule with unit tests plus the step-7a drive and logged a deviation. Diff does that, plan asked for the excluded kind, developer logged the deviation → **no finding**; that is the policy working. Diff contains the excluded kind *because* the plan asked → still Ts1, and the plan's wording is worth an `ARCHITECT AMENDMENT NEEDED:` note if the criterion cannot be met any other way.

**Locating candidates.** `node .claude/scripts/lint.craft.mjs --range <commit-range>` reports only what is decidable as **errors** — commented-out code (Cm2) and excluded-kind test files or harness imports (Ts1, Ts2). Everything judgemental comes back as a **candidate**: narration (Cm1), restatement (Cm3), comment density, and an introduced arch harness (Ts3). Cm4 and Ts4 it cannot see at all. It is your instrument, not a project gate — so `## Machine-enforced exclusions` does **not** suppress these findings on account of it. (If a project wires the script into CI or a pre-commit hook, the exclusion rule applies then, on that evidence, like any other detected gate.) Its errors are facts worth citing; its candidates are questions — confirm each against the charter before it becomes a finding, and never paste its output as the review.

---

## Naming and readability

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Na1 | Misleading name | A function, variable, or type name implies behaviour or semantics that differ from the implementation (e.g., `GetUser` that creates a user, `isValid` that returns a string) | Major |
| Na2 | Unexplained abbreviation | A non-standard abbreviation is used as an identifier without a comment or clear convention established in the codebase | Minor |