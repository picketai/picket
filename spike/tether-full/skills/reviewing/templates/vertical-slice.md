# Template: Vertical Slice Architecture Checklist

**Assumed structure:** Feature slices live under a `Features/` directory (or equivalent). Each slice owns its own handler, request/response types, and validator. Cross-slice sharing happens only through an explicit `Shared/` or `Common/` module.

Apply every check to the changed files.

---

## Slice isolation

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Vs1 | Cross-slice import | A file inside one feature slice imports a type, class, or function from another feature slice's internal directory (not from `Shared/` or `Common/`) | Critical |
| Vs2 | Slice internals exposed unnecessarily | A type defined inside a feature slice is `public` (C#) or exported without a barrel re-export (TS) but is only used within that slice | Minor |
| Vs3 | Shared logic placed in a slice | A utility, helper, or base class that is used by more than one slice lives inside a specific slice directory rather than `Shared/` or `Common/` | Major |

---

## Slice completeness

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Sc1 | Missing request/response types | A handler class or function exists without co-located request and response type definitions (or they are imported from outside the slice without being in `Shared/`) | Major |
| Sc2 | Missing validator | A command or mutation handler exists without a validator (FluentValidation, Zod, class-validator, or similar) when the project uses validation in other slices | Major |
| Sc3 | Handler doing too much | A single handler method performs more than one conceptually distinct operation (e.g., both creates and notifies in a single feature that could be two slices) | Minor |

---

## MediatR / messaging patterns (if applicable)

Skip this section if the project does not use MediatR, a command bus, or message dispatching.

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Me1 | Handler registered outside slice | A handler is registered in a global DI file instead of either auto-registered (assembly scan) or registered within the slice module | Minor |
| Me2 | Command/query naming mismatch | A command is named with a query-style name (e.g., `GetOrderCommand`) or vice versa | Minor |
| Me3 | Result type inconsistency | A handler returns a raw type instead of the project's standard result wrapper (e.g., `Result<T>`, `OneOf`, `ErrorOr`) when other handlers in the same codebase use one | Major |

---

## Over-engineering guard

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Oe1 | Premature abstraction | An interface or base class is introduced inside a slice that has exactly one implementation and no stated plan for extension | Minor |
| Oe2 | Unnecessary indirection | A slice introduces a service class that purely delegates to a repository without adding any logic — the handler could call the repository directly | Minor |