# .NET / C# checks

Apply to changed `.cs` files and their DI registration sites. Skip a row whose target construct does not appear.

## Async

| # | Check | Fail condition | Severity |
|---|---|---|---|
| A1 | Blocking on async | `.Result`, `.GetAwaiter().GetResult()`, or `.Wait()` on a `Task` or `ValueTask` in a synchronous method | Critical |
| A2 | CancellationToken not propagated | An `async` method takes no `CancellationToken` while one is available in the calling context, or takes one and does not forward it to inner awaits | Major |
| A3 | Fire-and-forget | A returned `Task` or `ValueTask` is discarded with no `await` and no explicit pattern (`_ = Task.Run(...)`) | Major |
| A4 | ConfigureAwait in library code | Library-layer code (not an application entry point) awaits without `ConfigureAwait(false)` | Minor |

## Dependency injection

| # | Check | Fail condition | Severity |
|---|---|---|---|
| D1 | Captive dependency | A singleton holds a constructor-injected scoped or transient dependency; `DbContext` in a singleton is the common case | Critical |
| D2 | New-ing a registered type | `new` creates a type that is registered in DI and should arrive through the constructor | Major |
| D3 | Missing registration | A new concrete type (non-static, non-nested, non-generic, not a record, DTO, or value object) has no `services.Add*` or `builder.Services` registration | Major |
| D4 | IDisposable as singleton | A type implementing `IDisposable` is registered as singleton rather than scoped or transient | Major |

## Entity Framework Core

| # | Check | Fail condition | Severity |
|---|---|---|---|
| E1 | N+1 query | A loop body (`foreach` over a `.ToList()` or `.ToArray()`, or `await foreach`) calls `dbContext.*` or touches a navigation property with no `.Include()` or explicit load | Critical |
| E2 | Tracking on a read | A read-only query (result neither modified nor saved) lacks `.AsNoTracking()` | Major |
| E3 | SaveChanges in a loop | `SaveChanges` or `SaveChangesAsync` is called inside a loop | Critical |
| E4 | Lazy load | A navigation property is accessed without `.Include()` and lazy loading is not explicitly enabled in the project | Major |

## Null safety

| # | Check | Fail condition | Severity |
|---|---|---|---|
| N1 | Null dereference | A nullable reference (`T?`) is accessed with no null check, `??`, or `?.` | Critical |
| N2 | Null-forgiving `!` | `!` is used with no preceding null check and no comment saying why null is impossible | Major |
| N3 | Unguarded argument | A public or internal method takes a reference-type parameter with no nullability annotation and no guard | Minor |

## Exceptions

| # | Check | Fail condition | Severity |
|---|---|---|---|
| X1 | Swallowed exception | A `catch` block has no `throw`, no logging call, and no meaningful handling: an empty body or a comment | Critical |
| X2 | Catch too broad | `catch (Exception)` or a bare `catch` where a specific type would do | Major |
| X3 | Throw in `finally` | Code in a `finally` block can throw and so masks the original exception | Critical |

## Disposal

| # | Check | Fail condition | Severity |
|---|---|---|---|
| R1 | Undisposed IDisposable | An `IDisposable` (`FileStream`, `StreamReader`, `StreamWriter`, a non-injected `HttpClient`, or any other) is created with `new` outside a `using` statement or declaration | Major |
