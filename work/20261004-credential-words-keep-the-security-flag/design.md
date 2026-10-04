---
kind: design
lane: design
title: Credential words keep the security flag
date: 2026-10-04
audience: developer
sources: request.md; .claude/lib/admit.mjs at 9b83b4c and d7fa166; test/kernel/admit.test.mjs; work/20261004-tidy-repository-before-tether-packaging/design.md D-004
phases:
  - n: 1
    files: [.claude/lib/admit.mjs, test/kernel/admit.test.mjs]
    greps:
      - path: .claude/lib/admit.mjs
        pattern: "CREDENTIAL_CONTEXT"
      - path: .claude/lib/admit.mjs
        pattern: "credential.tokens..secret"
      - path: test/kernel/admit.test.mjs
        pattern: "Limit the refresh token count per user to five"
      - path: test/kernel/admit.test.mjs
        pattern: "Invalidate cached tokens when the user logs out"
    tests: true
    drive: true
---
# Design: Credential words keep the security flag

## Problem
D-004 of `work/20261004-tidy-repository-before-tether-packaging/design.md` promised that removing non-credential "token" phrases before the `SECURITY` test fails closed, but `NOT_A_CREDENTIAL` in `.claude/lib/admit.mjs:28` also removes a phrase that a credential word qualifies: "Limit the refresh token count per user to five." now admits to `order` with `security: false`, while at d7fa166 it went to `design`. Running d7fa166's `admit.mjs` shows the request's second example, "Invalidate cached tokens when the user logs out.", went to `order` with `security: false` there too: `SECURITY` matches `\btoken\b`, so the plural "tokens" has never set the flag. That makes the second example an older gap, not a regression, and fixing it takes a second change. The binding constraint is that the security classifier fails closed: when in doubt, a request goes to `design`. "Rename the verdict token heading in the skill" and the existing T-2.3 and T-2.5 tests must still admit without the security flag.

## Decisions
### D-001: `SECURITY` matches the plural "tokens"
**Decision:** Infrastructural decision on the security classifier. The `token` alternative in `SECURITY` becomes `tokens?`, so "tokens" sets the flag the same way "token" does, unless a `NOT_A_CREDENTIAL` phrase removes it first. This closes the gap that lets "Invalidate cached tokens when the user logs out." pass, and it can only add security flags, never remove one.
**Instead of:** adding sign-in and sign-out words such as "logs out" to `SECURITY` itself: "Invalidate the cache when the user logs out" with no token in it would then go to `design`, which widens the classifier past what this request asks for, and "Revoke all tokens" would still miss the flag.
**Risks:**
- **RISK-001** Requests that use "tokens" in a usage sense not on the `NOT_A_CREDENTIAL` list ("Show the tokens per agent in the cost table") now go to `design`. Mitigation: this is the fail-closed direction; the extra lane costs process, not safety, and a phrase that keeps coming up is added to the list with a test.

### D-002: Any credential context word in the request turns off phrase removal
**Decision:** Infrastructural decision. A new constant `CREDENTIAL_CONTEXT` sits next to `NOT_A_CREDENTIAL`. It is a case-insensitive, word-bounded, non-global regex (no `g` flag, because `.test` on a global regex keeps `lastIndex` between calls). It matches the request's qualifiers `refresh`, `access`, `bearer`, `session`, `api`, `auth`, `jwt`, plus `oauth` and the sign-in and sign-out phrases: `log in`, `logs out`, `logged out`, `logging in` (optional space), `login`, `logout`, `sign in`, `signed out`, `sign-in` (optional space or hyphen), `signin`, `signout`. `withoutNonCredentialTokens(text)` returns the text unchanged when `CREDENTIAL_CONTEXT` matches anywhere in it, and removes `NOT_A_CREDENTIAL` phrases only when it does not. `NOT_A_CREDENTIAL` itself does not change. With D-001, "refresh token count" keeps "token" because of "refresh", and "cached tokens ... logs out" keeps "tokens" because of "logs out".
**Instead of:** the request's literal rule, a lookbehind that skips removal only when a qualifier comes directly before the phrase: it misses example 2 (the context words "logs out" are five words after the phrase), "the session's token budget" (a possessive between), and "token usage per session" (qualifier after). A whole-text check is one `.test` call and fails closed in each of these cases.
**Risks:**
- **RISK-002** A harness request that mentions an unrelated context word next to a usage phrase ("Show token usage per session in the cost table", "log in JSON") now goes to `design`. Mitigation: fail-closed direction, accepted; T-1.6 pins that a usage phrase with no context word still drops the flag.
- **RISK-003** A credential change worded only with a removed phrase and no context word ("Invalidate cached tokens.") still drops the flag, which is D-004's RISK-004 unchanged. Mitigation: the context list covers the common credential words; widening `NOT_A_CREDENTIAL` stays a tested change.

## Scope
**In:**
- `SECURITY` matches "token" and "tokens" (D-001).
- `CREDENTIAL_CONTEXT` and the guard in `withoutNonCredentialTokens` (D-002).
- Tests for the request's two examples, the verdict-token rename, and the new edges in `test/kernel/admit.test.mjs`.

**Out:**
- Treating sign-in or sign-out words as a security signal on their own (D-001, Instead of).
- Shrinking `NOT_A_CREDENTIAL` (for example dropping `cache|cached`); D-004 stands except for the guard D-002 adds.
- The security-path prefix check and `route.mjs`; the open item `20261004-run-grants-stop-at-record-marked-security-phases` owns route changes.
- Any change to the closed record's `design.md`.

## Phase 1: Credential context and plural tokens keep the security flag
**Touch set:**
- `.claude/lib/admit.mjs`: `SECURITY`, new `CREDENTIAL_CONTEXT`, `withoutNonCredentialTokens`
- `test/kernel/admit.test.mjs`: new admission cases beside T-2.3 to T-2.5

**Changes:** In `.claude/lib/admit.mjs`, change the `token` alternative of `SECURITY` (line 19) to `tokens?` (D-001). Add the module-level constant `CREDENTIAL_CONTEXT` after `NOT_A_CREDENTIAL` (line 28) with the shape D-002 gives. Change `withoutNonCredentialTokens(text): string` so it returns `text` as is when `CREDENTIAL_CONTEXT` matches, and otherwise does the current replace. `touchesSecurity`, `admit`, `recheck` and the exports keep their signatures. In `test/kernel/admit.test.mjs`, add tests in the existing style (a `repo()` root, `admit(text, { root })`, `assert.equal` on `lane` and `signals.security` with the text as the message, `rmSync` cleanup) for the criteria below. Existing tests stay as they are. No comments in either file.

**Done when:**
- **T-1.1** `admit("Limit the refresh token count per user to five.")` returns `lane: "design"` and `signals.security: true`.
- **T-1.2** `admit("Invalidate cached tokens when the user logs out.")` returns `lane: "design"` and `signals.security: true`.
- **T-1.3** `admit("Rename the verdict token heading in the skill")` returns `lane: "fast"` and `signals.security: false`.
- **T-1.4** `admit("Expire the tokens after 15 minutes of inactivity.")` returns `signals.security: true`, and `admit("Cap the access token count at five.")` returns `signals.security: true`.
- **T-1.5** The existing tests T-2.3, T-2.4 and T-2.5 in `test/kernel/admit.test.mjs` pass without edits, and `npm test` exits 0.
- **T-1.6** `admit("Show cached tokens per agent in the cost table.")` returns `signals.security: false`.
- **T-1.7** `harness drive --run "node .claude/bin/harness.mjs admit --text \"Limit the refresh token count per user to five.\" --human"` prints a line starting `lane: design` and ends `DRIVE OK`.

## Open questions
none

## Revision log
