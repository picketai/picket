# TypeScript / JavaScript checks

Apply to changed `.ts`, `.tsx`, `.mts`, `.cts`, and `.js` files. Skip a row whose target construct does not appear. React rows (Re*) apply only to files that import from `react` or `react-dom`.

## Type safety

| # | Check | Fail condition | Severity |
|---|---|---|---|
| T1 | No `any` | `any` as a type annotation or assertion outside test utilities and generated files | Major |
| T2 | Unsafe assertion | `as SomeType` with no preceding type guard, discriminant check, or `instanceof` that proves it | Major |
| T3 | Non-null assertion | `!` with no earlier null check in the same scope and no comment saying why null is impossible | Major |

## Promises

| # | Check | Fail condition | Severity |
|---|---|---|---|
| A1 | Floating promise | A Promise-returning call has no `await`, `.then()`, or `.catch()`, and is not marked fire-and-forget (`void` prefix or comment) | Critical |
| A2 | Unhandled rejection | `.then(handler)` with no `.catch()` and no second `.then` argument | Major |
| A3 | `async` without `await` | A function is declared `async` and contains no `await`; likely a missing `await` | Minor |
| A4 | Promise constructor antipattern | `new Promise((resolve, reject) => ...)` wraps a call that already returns a Promise | Minor |

## Error handling

| # | Check | Fail condition | Severity |
|---|---|---|---|
| E1 | Swallowed error | A `catch` body is empty, holds only a comment, or only `return`s, with no logging, rethrow, or documented reason | Critical |
| E2 | Unnarrowed catch binding | `catch (e)` uses `e` as an `Error` (reads `.message`, `.stack`) without `e instanceof Error` or `typeof` narrowing | Major |

## React

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Re1 | Conditional hook | A `use*` hook is called inside `if`, `for`, `while`, `switch`, or after a short-circuit `&&` | Critical |
| Re2 | Missing effect dependency | A `useEffect` dependency array omits a variable read in the effect body that is not a stable ref or setter | Major |
| Re3 | Stale closure | A `useCallback` or `useMemo` dependency array omits a state or prop variable used inside | Major |
| Re4 | Literal in JSX prop | A new `{}` or `[]` literal is created inline in a JSX prop without `useMemo`, re-rendering the child on every parent render | Minor |

## Modules and imports

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Mo1 | Circular import | A file imports from a module that, directly or through the changed files, imports back from it | Major |
| Mo2 | Private internals imported | A file imports from inside another feature or module directory (`../../other-feature/internals`) instead of its public barrel export | Major |

## Leaks

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Ml1 | Listener or timer not cleaned up | `addEventListener`, `setInterval`, or `setTimeout` is set up with no matching `removeEventListener` or clear in a cleanup path (a `useEffect` return, unmount, or destroy) | Major |
| Ml2 | Subscription not unsubscribed | An observable `.subscribe()` or similar is never unsubscribed in the destroy or unmount lifecycle | Major |
