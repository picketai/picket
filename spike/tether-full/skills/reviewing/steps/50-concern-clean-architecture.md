# Clean Architecture checks

Layers: Domain, then Application, then Infrastructure and Presentation. Inner layers never import outer ones. A file's layer is its directory: `Domain/`, `Application/`, `Infrastructure/`, `Presentation/` or `API/`. Other names: infer from the pattern, innermost is domain. Apply to the changed files.

## Dependency direction

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Ca1 | Domain purity | A `Domain/` file imports from `Application/`, `Infrastructure/`, or `Presentation/` | Critical |
| Ca2 | Application isolation | An `Application/` file imports `Infrastructure/` or `Presentation/` directly, or news a concrete infrastructure type (`SmtpClient`, `HttpClient`, `FileStream`), instead of going through an interface defined in `Application/` | Critical |
| Ca3 | Infrastructure leak into domain | A `Domain/` type carries ORM attributes (`[Column]`, `[Table]`, `[Key]`, `[DatabaseGenerated]`), serialisation attributes (`[JsonProperty]`, `[JsonIgnore]`), or HTTP attributes | Critical |
| Ca4 | Repository in presentation | A controller, endpoint, or presenter imports a repository implementation instead of an application service or use case | Major |

## Domain model

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Dm1 | Anemic domain | Business logic (a conditional deciding a state transition or enforcing an invariant) lives in an Application handler instead of on the entity or aggregate | Major |
| Dm2 | Primitive ids | Entity identifiers are `int`, `long`, `string`, or `Guid` with no wrapping value object, while the plan or the same bounded context uses value objects elsewhere | Minor |
| Dm3 | Public setters | A domain entity exposes public `set` on properties that carry invariants, so outside code can put it in an invalid state | Major |

## Use cases

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Uc1 | Use case too large | One handler method coordinates more than one aggregate root or calls more than one repository within the same logical step | Major |
| Uc2 | Cross-aggregate transaction | One use case writes two or more aggregate roots in one transaction with no documented reason (eventual consistency is the default) | Major |

## Interfaces

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Ia1 | Interface in the wrong layer | An interface implemented in `Infrastructure/` is defined in `Infrastructure/` rather than `Application/` | Major |
| Ia2 | Leaky abstraction | An interface method accepts or returns an implementation-specific type (`IDbContextTransaction`, `SqlConnection`, `HttpRequestMessage`) | Major |
