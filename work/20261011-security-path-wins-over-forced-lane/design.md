---
kind: design
lane: design
title: Security path wins over forced lane
date: 2026-10-11
audience: developer
sources: request.md; core/lib/admit.mjs:30-35, :47-49, :72-93, :95-105, :128-134; core/bin/picket.mjs:99-107; core/lib/config.mjs:7; core/rules/security-paths.md; core/skills/expediting/SKILL.md:23, :33; core/skills/designing/SKILL.md:24; docs/how-to.md:280; docs/skills.md:27; core/lib/config.mjs:53-58; test/kernel/admit.test.mjs; test/kernel/config-fixture.mjs
phases:
  - n: 1
    files: [core/lib/admit.mjs, test/kernel/admit.test.mjs]
    greps:
      - path: core/lib/admit.mjs
        pattern: 'security_path_hits'
      - path: test/kernel/admit.test.mjs
        pattern: 'security_path_hits'
      - path: test/kernel/admit.test.mjs
        pattern: '\./src/auth/login\.ts'
    tests: true
    drive: true
    security: true
---
# Design: Security path wins over forced lane

## Problem

`admit()` returns a forced lane at `core/lib/admit.mjs:93`, before the heavy-lane checks at `:101-105`, so `lane: fast` plus a touched `src/auth/login.ts` stays fast. The security-paths rule says a change under a security path always takes the design lane, and `docs/how-to.md:280` promises the same for a forced lane. `recheck()` (`:128-134`) calls `admit()` with the touch set, so the expediting skill's re-check at its first Edit (`core/skills/expediting/SKILL.md:33`) inherits the gap. The forced lane is also the documented escape from a text misread (`docs/how-to.md:280`, "The wrong lane"), so the fix must not take that escape away for word-only matches, and a forced `lane: design` must keep working.

## Decisions

### D-001: Only path evidence overrides a forced lane
**Decision:** A forced `fast` or `order` lane becomes `design` when a touched path, or a mentioned path that exists on disk (`mentionedPaths`), sits under a security path. The `SECURITY` word regex and the bare substring match (`text.includes(s)` in `touchesSecurity`) still feed `signals.security` and still decide the unforced lane, but they do not override a forced lane. Infrastructural decision. This matches the rule's wording, "a change under one of these paths", and keeps the forced lane useful for its stated purpose. Example: `lane: fast. Fix the permission prompt wording in src/config.ts.` stays fast; `lane: fast. Fix the typo in the login helper.` with `--touched src/auth/login.ts` becomes design.
**Instead of:** any security signal wins over a forced lane: the word regex fires on "permission", "tokens", "secret" and "crypto" in ordinary harness requests, so the one escape a user has from that misread would disappear exactly where it is needed.
**Risks:**
- **RISK-001** A forced fast request that names a new file under `src/auth/` (not yet on disk) passes admission as fast. Mitigation: the expediting skill re-checks with `--touched` in the same batch as its first Edit, and that path is now covered by T-1.2.
- **RISK-002** A request that only mentions a security directory (`src/auth/`) without changing it is not escalated by the mention. Mitigation: intended; `mentionedPaths` yields `src/auth` (no trailing slash), which is not under `src/auth/`, and T-1.3 pins that.

### D-002: The override applies to forced fast and order only
**Decision:** A forced `design` returns design as today. A forced `research` stays research even with a security path in the touch set, because research writes no code, the unforced flow already puts research before the security check (`admit.mjs:95`), and `recheck()` never escalates research (`admit.mjs:131`). Infrastructural decision.
**Instead of:** override every forced lane to design: it would turn "explain how src/auth/login.ts works" into a design record with phases for a request that changes nothing.
**Risks:**
- **RISK-003** A research item that later writes code under a security path escapes the design lane. Mitigation: the research lane's own contract forbids production edits outside `spike/`; out of scope here.

### D-003: Security path matching normalises the path form
**Decision:** Before the prefix match, a path has `\` turned into `/` and a leading `./` removed, for both touched and mentioned paths, in the one predicate that `signals.security` and the forced-lane override share. Infrastructural decision. `--touched src\auth\login.ts` from a Windows shell today fails `startsWith("src/auth/")`, which is fail-open on the exact input this item hardens.
**Instead of:** leave the raw `startsWith`: simpler, but a guard that a backslash defeats is the "checked becomes assumed" case the security checklist warns about.
**Risks:**
- **RISK-004** Matching stays case-sensitive, so `Src/Auth/x.ts` on a case-insensitive file system slips past. Mitigation: recorded as OQ-001 with today's behaviour as the fallback.

### D-004: The result keeps the forced lane visible
**Decision:** The overridden result carries `lane: "design"`, keeps `signals.forced` as the lane the user asked for, adds `signals.security_path_hits` (sorted, unique, normalised paths under a security path; `[]` when none) for every call, and keeps the forced reason followed by one reason naming the hits. Example reasons: `["lane forced by request (lane: fast)", "a security path wins over the forced lane: src/auth/login.ts"]`, so `--human` prints `lane: design (lane forced by request (lane: fast); a security path wins over the forced lane: src/auth/login.ts)`. Additive to the JSON shape; no existing key changes meaning.
**Instead of:** replace the reasons with the generic security reason: the user would not see why their directive did not hold and would retry it.
**Risks:**
- **RISK-005** A consumer that treats `signals.forced` as "the returned lane" misreads an overridden result. Mitigation: the only in-repo consumer prints `lane` and `reasons` (`core/bin/picket.mjs:106`); the reason text says the directive lost.

## Scope

**In:**
- `admit()` override of a forced fast or order lane by path evidence, and through it `recheck()`.
- Path normalisation inside the security path predicate.
- `signals.security_path_hits` and the override reason.
- Kernel tests in `test/kernel/admit.test.mjs`.

**Out:**
- The `SECURITY` word regex and the substring match: unchanged, and still unable to beat a forced lane.
- Case-insensitive matching and security directories nested below the repo root (`src/Api/Authentication/`): today's root-prefix match stays (OQ-001).
- Doc and skill text: `docs/how-to.md:280` and the security-paths rule already state the target behaviour.

## Phase 1: A security path overrides a forced fast or order lane

**Touch set:**
- `core/lib/admit.mjs`: forced-lane return, security predicate
- `test/kernel/admit.test.mjs`: fixture file, new tests
- `test/kernel/config-fixture.mjs`: `writeConfig` helper, read only

**Changes:**
- `core/lib/admit.mjs`: one exported-or-local helper that takes a path list and the configured security paths and returns the sorted, unique, normalised paths under a security path (D-003). `touchesSecurity` uses it for its path half, so `signals.security` and the override agree. `signals` gains `security_path_hits` computed over `[...mentionedPaths, ...touched]`. The forced-lane return at `:93` becomes: forced `fast` or `order` with hits returns design with the two reasons of D-004; every other forced lane returns as today. The unforced flow is unchanged apart from the normalised predicate.
- `test/kernel/admit.test.mjs`: add `src/auth/login.ts` to the `repo()` fixture list (no existing test names it, and the existing `src/auth/` test lands in design through the word signal either way), then the tests behind T-1.1 to T-1.5 and T-1.7.

**Done when:**
- **T-1.1** `admit("lane: fast. Fix the typo in the login helper.", { root, touched: ["src/auth/login.ts"] })` returns `lane: "design"`, `signals.forced: "fast"`, `signals.security_path_hits: ["src/auth/login.ts"]`, and reasons equal to the two strings of D-004; the same call with `lane: order` also returns design; `admit("lane: fast. Fix the typo in src/auth/login.ts.", { root })` with no touch set returns design through the mentioned path.
- **T-1.2** `recheck("fast", "lane: fast. Fix the typo in the login helper.", ["src/auth/login.ts"], { root })` returns `escalate: true` and `lane: "design"`.
- **T-1.3** `admit("lane: fast. Fix the permission prompt wording in src/config.ts.", { root })` returns `lane: "fast"` with `signals.security: true` and `security_path_hits: []`; `admit("lane: fast. Name src/auth/ in the docs table.", { root })` returns fast with `security_path_hits: []`.
- **T-1.4** With forced `lane: fast`, touched `["src\\auth\\login.ts"]` and touched `["./src/auth/login.ts"]` each return design with `security_path_hits: ["src/auth/login.ts"]`; without the directive the same touch sets give `signals.security: true`.
- **T-1.5** `lane: design` with touched `["src/auth/login.ts"]` returns design with the single forced reason; `lane: research` with the same touch set returns research.
- **T-1.6** `picket drive --run "node core/bin/picket.mjs admit --text \"lane: fast. Fix the typo in the login helper.\" --touched src/auth/login.ts --human"` prints a line starting `lane: design (lane forced by request (lane: fast); a security path wins over the forced lane: src/auth/login.ts)`.
- **T-1.7** After `writeConfig(root, { version: 1, security_paths: ["lib/secure/"] })`, `admit("lane: fast. Fix the typo.", { root, touched: ["lib/secure/keys.ts"] })` returns design, and `npm test` passes with every existing admit test unchanged.

## Open questions

- **OQ-001** Should security path matching ignore case and match a security directory below the repo root (`src/Api/Authentication/`), given the defaults include .NET-style `Authentication/` and `Authorization/`? Owner: user. Fallback: this item keeps today's case-sensitive root-prefix match; a project lists nested paths in `.picket/config.json` under `security_paths`.

## Revision log
