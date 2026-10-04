# Template: .NET / C# Checklist

Apply every check to the changed files. Skip a check silently if its target construct does not appear in the changed files.

---

## Async / Await

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| A1 | No blocking on async | `.Result`, `.GetAwaiter().GetResult()`, or `.Wait()` called on a `Task` or `ValueTask` in a synchronous method | Critical |
| A2 | CancellationToken propagation | An `async` method accepts no `CancellationToken` parameter when a token is available in the calling context — OR a token is accepted but not forwarded to inner `await`s | Major |
| A3 | Fire-and-forget handling | `Task` or `ValueTask` returned by an async call is discarded without `await`, `.ConfigureAwait`, or explicit fire-and-forget pattern (e.g., `_ = Task.Run(...)`) | Major |
| A4 | ConfigureAwait in library code | Library-layer code (not application entry points) calls `await` without `ConfigureAwait(false)` | Minor |

---

## Dependency Injection

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| D1 | Captive dependency | A singleton service holds a constructor-injected scoped or transient dependency | Critical |
| D2 | New-ing dependencies | `new` used to create a type that is registered in DI and should be resolved via constructor | Major |
| D3 | Registration completeness | A new concrete type is introduced (non-static, non-nested, non-generic) without a corresponding `services.Add*` or `builder.Services` registration — AND it is not a record/DTO/value object | Major |
| D4 | IDisposable in DI | A type implements `IDisposable` but is not registered as scoped or transient (i.e., registered as singleton) | Major |

---

## Entity Framework Core

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| E1 | N+1 query | A `.ToList()`, `.ToArray()`, or `await foreach` loop body calls `dbContext.*` or a navigation property without an `.Include()` or explicit load | Critical |
| E2 | AsNoTracking on reads | A query that is read-only (result not modified and not saved) does not call `.AsNoTracking()` | Major |
| E3 | SaveChanges placement | `SaveChanges` / `SaveChangesAsync` called inside a loop | Critical |
| E4 | Lazy loading | Navigation property accessed without `.Include()` and lazy loading is not explicitly enabled in the project | Major |
| E5 | DbContext lifetime | `DbContext` injected into a singleton service | Critical |

---

## Null safety

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| N1 | Null dereference | A nullable reference type (`T?`) is accessed without a null check, null-coalescing, or null-conditional operator | Critical |
| N2 | Null-forgiving operator | `!` (null-forgiving) used without a preceding null-check or a comment explaining why null is impossible | Major |
| N3 | Argument null check | A public or internal method receives a reference-type parameter with no nullability annotation and no guard | Minor |

---

## Exception handling

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| X1 | Swallowed exception | A `catch` block contains no `throw`, no logging call, and no meaningful handling — just a comment or empty body | Critical |
| X2 | Catching Exception too broadly | `catch (Exception)` or `catch` without a type where a more specific type could be used | Major |
| X3 | Exception in finally | Code in a `finally` block that can throw — masks the original exception | Critical |

---

## Resource disposal

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| R1 | Undisposed IDisposable | A type implementing `IDisposable` is instantiated with `new` outside of a `using` statement or declaration | Major |
| R2 | Stream left open | `FileStream`, `StreamReader`, `StreamWriter`, `HttpClient` (when not injected), or similar stream created without `using` | Major |