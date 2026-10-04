# Template: Clean Architecture Checklist

**Assumed layer structure:** Domain → Application → Infrastructure / Presentation.
The dependency rule: inner layers must not import from outer layers.

Apply every check to the changed files. Determine a file's layer from its directory path: `Domain/` = domain, `Application/` = application, `Infrastructure/` = infrastructure, `Presentation/` or `API/` = presentation. If the project uses different names, infer from the pattern (innermost = domain).

---

## Dependency direction

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Ca1 | Domain purity | A file in `Domain/` imports from `Application/`, `Infrastructure/`, or `Presentation/` | Critical |
| Ca2 | Application isolation | A file in `Application/` imports from `Infrastructure/` or `Presentation/` directly — rather than through an interface defined in `Application/` | Critical |
| Ca3 | Infrastructure leak into domain | An `Infrastructure/` concern appears in a `Domain/` type: ORM attributes (`[Column]`, `[Table]`, `[Key]`, `[DatabaseGenerated]`), serialisation attributes (`[JsonProperty]`, `[JsonIgnore]`), or HTTP attributes | Critical |
| Ca4 | Repository used directly in presentation | A controller, endpoint, or presenter imports a repository implementation directly instead of an application service or use-case | Major |

---

## Domain model quality

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Dm1 | Anemic domain model | Business logic (conditionals deciding a state transition or invariant enforcement) is written in an Application handler rather than on the domain entity or aggregate | Major |
| Dm2 | Primitive obsession for IDs | Entity identifiers are typed as `int`, `long`, `string`, or `Guid` without a wrapping value-object type — when the plan or existing code uses value objects elsewhere in the same bounded context | Minor |
| Dm3 | Public setters on domain entity | A domain entity exposes public `set` accessors on properties that represent invariants — allowing external code to put the entity into an invalid state | Major |

---

## Use cases / application layer

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Uc1 | Use-case size | A single use-case handler method exceeds one domain operation: it coordinates more than one aggregate root or calls more than one repository within the same logical step | Major |
| Uc2 | Missing abstraction at boundary | Application layer calls a concrete infrastructure type directly (`new SmtpClient()`, `new HttpClient()`, `new FileStream()`) instead of an interface | Critical |
| Uc3 | Cross-aggregate transaction | A single use-case writes to two or more aggregate roots in one transaction without a documented reason (eventual consistency is the default) | Major |

---

## Interface / abstraction hygiene

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Ia1 | Interface defined in wrong layer | An interface whose implementation lives in `Infrastructure/` is defined in `Infrastructure/` rather than in `Application/` | Major |
| Ia2 | Leaky abstraction | An interface method accepts or returns a type that is specific to the implementing infrastructure (e.g., `IDbContextTransaction`, `SqlConnection`, `HttpRequestMessage`) | Major |