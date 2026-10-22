# General patterns (medium and large; security_path forces full)

Universal correctness and maintainability checks. On medium, skip the SOLID and DRY sections. Skip any row whose target construct does not appear in the changed files.

## SOLID

| # | Check | Fail condition | Severity |
|---|---|---|---|
| S1 | Single responsibility | A class has more than one public concern (HTTP routing and business logic and persistence) without being a deliberate coordinator | Major |
| S2 | Open/closed | A `switch` or `if-else` chain dispatches on a type discriminator so that a new case means editing the chain, and the project uses the polymorphic pattern elsewhere | Minor |
| S3 | Liskov substitution | An override throws `NotImplementedException` or `NotSupportedException`, or is left empty, where the base defines observable behaviour | Critical |
| S4 | Interface segregation | A class implements an interface but stubs one or more methods (returns default, null, or empty) | Major |
| S5 | Dependency inversion | High-level code (handler, service, controller) news a low-level concrete type (database, file system, network) instead of taking an interface | Major |

## DRY

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Dr1 | Copy-paste duplication | A block of 5 or more lines appears verbatim, or with only variable names changed, in two or more places within the changed files | Major |
| Dr2 | Magic number | A numeric or string literal drives logic (condition, calculation, key name) without a named constant, and it repeats or its meaning is not obvious in context | Minor |

## Correctness

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Co1 | Mutated input argument | A function modifies a reference-type argument the caller passed in, and the parameter is not named or documented as an output | Critical |
| Co2 | Off-by-one | A loop bound uses `<` for `<=` or `>` for `>=` so the first or last element is skipped; verify by tracing the index against the collection size | Critical |
| Co3 | Wrong equality | Reference equality (`==` on objects, `ReferenceEquals`, `is` without a pattern) where value equality is intended on a type that overrides `Equals` | Critical |
| Co4 | Mutable shared state | A `static` or module-level variable is written by instance methods without synchronisation where concurrent access is possible | Critical |

## Naming and readability

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Na1 | Misleading name | A function, variable, or type name implies behaviour the implementation does not have (`GetUser` that creates a user, `isValid` that returns a string) | Major |
| Na2 | Unexplained abbreviation | A non-standard abbreviation is used as an identifier with no comment and no convention established in the codebase | Minor |
