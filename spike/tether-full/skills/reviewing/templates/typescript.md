# Template: TypeScript / JavaScript Checklist

Apply every check to the changed files. Skip a check silently if its target construct does not appear in the changed files. React-specific checks (R*) apply only if the changed file imports from `react` or `react-dom`.

---

## Type safety

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| T1 | No `any` | `any` used as a type annotation or assertion — except in test utilities or generated files | Major |
| T2 | Unsafe type assertion | `as SomeType` used without a preceding type-guard, discriminant check, or `instanceof` check that proves the assertion correct | Major |
| T3 | Non-null assertion | `!` (non-null assertion) used without an earlier null-check in the same scope or a comment explaining why null is impossible | Major |
| T4 | Untyped catch binding | `catch (e)` used and `e` is accessed without narrowing (`e instanceof Error`, `typeof e`, etc.) | Minor |

---

## Async / Promises

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| A1 | Floating promise | A `Promise`-returning call is made without `await`, `.then()`, or `.catch()` — and is not explicitly fire-and-forget (no `void` prefix and no comment) | Critical |
| A2 | Unhandled rejection in `.then()` | `.then(handler)` used without a `.catch()` or a second argument to `.then()` | Major |
| A3 | `async` without `await` | A function is declared `async` but contains no `await` expression — likely missing an `await` | Minor |
| A4 | Promise constructor antipattern | `new Promise((resolve, reject) => ...)` wraps a call that already returns a Promise | Minor |

---

## Error handling

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| E1 | Empty catch | `catch` block with an empty body or only a comment | Critical |
| E2 | Silent swallow | `catch (e) {}` or `catch (e) { return; }` without logging, rethrowing, or a documented reason | Critical |
| E3 | Generic catch without narrowing | `catch (e)` where `e` is used as if it is an `Error` without `instanceof Error` narrowing | Major |

---

## React (load only if file imports from `react`)

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Re1 | Hook called conditionally | A hook (`use*`) is called inside an `if`, `for`, `while`, `switch`, or a short-circuit `&&` | Critical |
| Re2 | Missing `useEffect` dependency | `useEffect` has a dependency array that omits a variable read inside the effect body (that is not a stable ref or setter) | Major |
| Re3 | Stale closure | A `useCallback` or `useMemo` dependency array omits a state or prop variable used inside | Major |
| Re4 | Object/array literal in JSX prop | A new object `{}` or array `[]` literal is created inline in JSX without `useMemo` — causes unnecessary re-renders on every parent render | Minor |
| Re5 | Missing cleanup in useEffect | `useEffect` sets up a subscription, timer, or event listener without returning a cleanup function | Major |

---

## Module / imports

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Mo1 | Circular import | A file imports a symbol from a module that (directly or transitively via the same changed files) imports back from the original file | Major |
| Mo2 | Importing private internals | A changed file imports from a path inside another feature/module directory (e.g., `../../other-feature/internals`) rather than that module's public barrel export | Major |

---

## Memory leaks

| # | Check | Fail condition | Severity |
|---|-------|----------------|----------|
| Ml1 | Event listener not removed | `addEventListener` called without a corresponding `removeEventListener` in a cleanup path | Major |
| Ml2 | Subscription not unsubscribed | An observable `.subscribe()` or similar subscription not cleaned up in a destroy/unmount lifecycle | Major |
