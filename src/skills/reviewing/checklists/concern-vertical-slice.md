# Vertical Slice checks

Slices live under `Features/` (or the project's equivalent). Each slice owns its handler, request and response types, and validator; cross-slice sharing goes only through `Shared/` or `Common/`. Apply to the changed files. Skip the messaging section when the project has no MediatR, command bus, or dispatcher.

## Slice isolation

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Vs1 | Cross-slice import | A file in one slice imports a type, class, or function from another slice's internal directory rather than from `Shared/` or `Common/` | Critical |
| Vs2 | Internals exposed | A type defined inside a slice is `public` (C#) or exported without a barrel re-export (TS) yet used only within that slice | Minor |
| Vs3 | Shared logic inside a slice | A helper, utility, or base class used by more than one slice lives in a slice directory instead of `Shared/` or `Common/` | Major |

## Slice completeness

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Sc1 | Missing request/response types | A handler exists without co-located request and response types, or imports them from outside the slice and outside `Shared/` | Major |
| Sc2 | Missing validator | A command or mutation handler has no validator (FluentValidation, Zod, class-validator, or similar) while other slices validate | Major |
| Sc3 | Handler doing too much | One handler performs two conceptually distinct operations (creates and notifies) that could be two slices | Minor |

## Messaging

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Me1 | Handler registered globally | A handler is registered in a global DI file rather than by assembly scan or within its slice module | Minor |
| Me2 | Command/query naming mismatch | A command carries a query-style name (`GetOrderCommand`) or the reverse | Minor |
| Me3 | Result type inconsistency | A handler returns a raw type while other handlers use the project's result wrapper (`Result<T>`, `OneOf`, `ErrorOr`) | Major |

## Over-engineering

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Oe1 | Premature abstraction | An interface or base class inside a slice has exactly one implementation and no stated plan for another | Minor |
| Oe2 | Unnecessary indirection | A slice adds a service that only delegates to a repository with no logic of its own; the handler could call the repository | Minor |
