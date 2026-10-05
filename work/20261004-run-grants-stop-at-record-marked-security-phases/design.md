---
kind: design
lane: design
title: Run grants stop at record-marked security phases
date: 2026-10-05
audience: developer
sources: [request, .claude/lib/route.mjs, .claude/lib/next.mjs, .claude/lib/packet.mjs, .claude/lib/work.mjs, .claude/lib/config.mjs, .claude/lib/admit.mjs, .claude/lib/verify.mjs, .claude/lib/yaml-lite.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/lint.schema.mjs, .claude/agents/developer.md, .claude/skills/documenting/templates/design.md, .claude/skills/documenting/templates/order.md, .claude/skills/designing/SKILL.md, .claude/skills/designing/steps/10-design.md, .claude/skills/ordering/SKILL.md, .claude/skills/ordering/steps/20-phase.md, .claude/skills/ordering/steps/30-gate.md, .claude/rules/work-items.md, .claude/rules/security-paths.md, test/kernel/route.test.mjs, test/kernel/next.test.mjs, test/kernel/packet.test.mjs, test/hooks/hooks.test.mjs, work/20261004-tidy-repository-before-tether-packaging/design.md]
phases:
  - n: 1
    files: [.claude/lib/gate.mjs, .claude/lib/route.mjs, .claude/lib/admit.mjs, test/kernel/gate.test.mjs, test/kernel/route.test.mjs]
    greps:
      - path: .claude/lib/gate.mjs
        pattern: "export function ownGate\\("
      - path: .claude/lib/route.mjs
        pattern: "from \"\\./gate\\.mjs\""
      - path: test/kernel/gate.test.mjs
        pattern: "security: true"
      - path: test/kernel/route.test.mjs
        pattern: "marked security-sensitive"
    tests: true
    drive: false
    security: true
  - n: 2
    files: [.claude/lib/next.mjs, .claude/lib/packet.mjs, test/kernel/next.test.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: .claude/lib/next.mjs
        pattern: "own_gate"
      - path: .claude/lib/next.mjs
        pattern: "from \"\\./gate\\.mjs\""
      - path: .claude/lib/packet.mjs
        pattern: "field\\(\"gate\""
      - path: test/kernel/next.test.mjs
        pattern: "own_gate"
      - path: test/kernel/packet.test.mjs
        pattern: "run grants stop here"
    tests: true
    drive: false
    security: false
  - n: 3
    files: [.claude/skills/documenting/templates/design.md, .claude/hooks/lint.schema.mjs, test/hooks/hooks.test.mjs, .claude/skills/designing/steps/10-design.md, .claude/skills/ordering/steps/20-phase.md, .claude/skills/designing/SKILL.md, .claude/skills/ordering/SKILL.md, .claude/rules/work-items.md]
    greps:
      - path: .claude/skills/documenting/templates/design.md
        pattern: "^    security: "
      - path: .claude/hooks/lint.schema.mjs
        pattern: "security must be true or false"
      - path: test/hooks/hooks.test.mjs
        pattern: "security must be true or false"
      - path: .claude/skills/designing/steps/10-design.md
        pattern: "`drive`, `security`"
      - path: .claude/skills/ordering/steps/20-phase.md
        pattern: "says `implement_phase`"
      - path: .claude/rules/work-items.md
        pattern: "`security`"
    tests: true
    drive: false
    security: true
---
# Design: Run grants stop at record-marked security phases

## Problem

`phaseNeedsOwnGate` (`.claude/lib/route.mjs:69` to `:78`) stops a run grant only when a frontmatter `files` path sits under a configured security prefix or the phase body carries `[IRREVERSIBLE]`. On 2026-10-04 phase 2 of `work/20261004-tidy-repository-before-tether-packaging/design.md`, whose body said "Security-relevant (D-004): this phase never shares a run grant", was approved and committed (9ddd51f) inside "run through 4", because a record has no machine-readable way to mark a phase. The prose and the kernel also disagree on the input: `.claude/skills/designing/SKILL.md:44` and `.claude/skills/ordering/steps/20-phase.md:26` say "touch set", the kernel reads only frontmatter `files`, and the developer step keeps its own copy of the rule. Binding: fail closed (the configured paths, the touch set or the record each stop a run on their own), one computation shared by route, next, packet and the prose, no change to admission, no new code comments, step files at most 80 lines and SKILL.md at most 150 (`test/budgets.test.mjs`).

## Decisions

### D-001: A record marks a phase with `security: true` on its frontmatter entry
**Decision:** Infrastructural decision. The phase's entry in the artifact's `phases:` frontmatter gains a `security` key. The kernel reads it fail closed: the phase is marked when the key is present and its value is anything other than boolean `false`, so `security: true`, `security: yes` and `security: "auth"` all mark it, while `security: false` and an absent key do not. The design template carries `security:` on every entry, and `lint.schema` reports a design record whose entry lacks a boolean `security`, so the architect states the choice for every phase. An order record may carry the key and the kernel honours it, but the order template does not ask for it: a security phase belongs to the design lane.
**Instead of:** a body tag `[SECURITY]` beside `[IRREVERSIBLE]`: any phase whose prose quotes the tag, as every phase of this item does, would be gated, and the body is prose for people while the frontmatter is the contract the kernel already parses for must_haves.
**Risks:**
- **RISK-001** The architect writes `security: false` on a phase that is security-sensitive. Mitigation: the configured prefixes and the touch set still gate it (D-002), and the cross-check reviewer reads the frontmatter beside the phase.
- **RISK-002** A non-boolean value such as `security: no` gates a phase the architect meant to leave open. Mitigation: that is the fail-closed direction; `lint.schema` names the entry so the architect fixes it before the developer starts.

### D-002: One kernel function decides a phase's own gate, in its own module
**Decision:** Infrastructural decision. A new module `.claude/lib/gate.mjs` exports `ownGate(id, n, root) -> { kind, reason } | null`, with `kind` one of `"security_path" | "security_mark" | "irreversible"`, checked in that order, and `reason` a predicate that reads after "phase N": `touches a security path (src/auth/guard.ts)`, `is marked security-sensitive in the record`, `carries an irreversible step`. A security path is matched over the union of the entry's frontmatter `files` and the backticked paths in the phase body's `**Touch set:**` bullets, against `securityPaths(root)` from `.claude/lib/config.mjs`, normalised as today (`**` dropped, trailing `/` added, backslashes turned to `/`). `route.mjs` drops `phaseNeedsOwnGate` and calls `ownGate`; `next.mjs` calls it too (D-004).
**Instead of:** keeping the function in `route.mjs` and importing it from `next.mjs`: `route.mjs` already imports `next.mjs`, so the import would form a cycle, and the gate would stay tied to verdict routing when it is a fact about the record.
**Risks:**
- **RISK-003** A touch set written in another shape (a path not in backticks, a bullet without `- `) is not read. Mitigation: frontmatter `files` is still checked; a test pins the template's bullet shape `` - `path`: why ``.
- **RISK-004** One more kernel module to maintain. Mitigation: it holds one exported function and its parsing helpers, with its own test file.

### D-003: The developer and the lead follow the kernel, with no rule of their own
**Decision:** Infrastructural decision. `.claude/skills/ordering/steps/20-phase.md:26` loses its security-path clause: inside a granted run the developer still ends its turn after each block (its phase loop step 6 in `.claude/agents/developer.md`), and the lead sends the next phase only while `harness next` says `implement_phase`. `.claude/skills/designing/SKILL.md:44` and `.claude/skills/ordering/SKILL.md:42` say a run grant stops at any phase that takes its own gate, and that `harness next` names why. None of them restates the three conditions.
**Instead of:** restating the conditions (security path in touch set or files, `security` mark, `[IRREVERSIBLE]`) in each step file: two copies drift, which is how the skill came to say "touch set" while the kernel read `files`.
**Risks:**
- **RISK-005** A lead that skips `harness next` inside a run sends a gated phase's successor. Mitigation: route never auto-approves a gated phase, so `harness next` still answers `approve_phase` for it, and the gate packet shows the reason (D-004).

### D-004: `harness next` and the gate packet name the reason for an own gate
**Decision:** Infrastructural decision. Every `next()` result carries `own_gate: { kind, reason } | null`; the `approve_phase` branch for order and design lanes fills it from `ownGate` and appends `; it <reason>` to `detail`. The gate packet adds one field line after `files` when `own_gate` is set: `gate      phase N <reason>; run grants stop here`, cut to the width like every other field. Research and every other action keep `own_gate: null`.
**Instead of:** relying on route's `applied` line (`run grant stops here: ...`): the lead sees it once in the hook context and the user never sees it, so a stopped run looks like a missed grant.
**Risks:**
- **RISK-006** A long touch-set path makes the gate line exceed the width. Mitigation: the line goes through `field()`, which cuts with an ellipsis; the packet test asserts every line fits `WIDTH`.

## Scope

**In:**
- The `security` frontmatter key: kernel reading, design template, `lint.schema`, the architect section of `.claude/skills/designing/steps/10-design.md`, `.claude/rules/work-items.md`.
- `ownGate` in `.claude/lib/gate.mjs`, used by `route.mjs` and `next.mjs`; the touch-set union.
- The `own_gate` field in `next()`, its `detail`, and the packet's gate line.
- The run-grant wording in `.claude/skills/ordering/steps/20-phase.md`, `.claude/skills/designing/SKILL.md`, `.claude/skills/ordering/SKILL.md`.
- Deleting the comment above `securityPaths` in `.claude/lib/admit.mjs` that this change makes stale (`.claude/rules/comments.md`); no other line of that file.

**Out:**
- Admission (`admit()`, `recheck()`, its patterns).
- The order template: it gains no `security` key.
- The `⚠ irreversible` line and `[i]` option in the packet (`.claude/skills/designing/SKILL.md:44`), still composed by the lead.
- The copies of `route.mjs` under `spike/`.
- Re-marking closed work items.

## Phase 1: The kernel gate reads the record's mark and the touch set

**Touch set:**
- `.claude/lib/gate.mjs`: new, `ownGate` per D-002
- `.claude/lib/route.mjs`: call `ownGate`, drop `phaseNeedsOwnGate`
- `.claude/lib/admit.mjs`: delete stale comment line 50
- `test/kernel/gate.test.mjs`: new, one test per input
- `test/kernel/route.test.mjs`: run grant stops at a marked phase

**Changes:** Create `gate.mjs` importing `readArtifact` from `./work.mjs` and `securityPaths` from `./config.mjs`. `ownGate(id, n, root)` returns `{ kind, reason }` or `null` per D-001 and D-002: find the frontmatter entry with `Number(p.n) === Number(n)`; take its `files`; take the phase section with the regex `route.mjs:75` uses today; inside it, the text from `**Touch set:**` up to the next line that starts with `**`, and from that the first backticked span of each `- ` bullet. A path in either list under a prefix gives `security_path` with the first matching path in the reason; else an entry with `security` present and not `false` gives `security_mark`; else `[IRREVERSIBLE]` in the section gives `irreversible`. In `route.mjs`, the `phase_done` branch calls `ownGate` and writes `run grant stops here: phase ${phase} ${gate.reason}; it takes its own approval`; delete `phaseNeedsOwnGate`, its doc line and the `securityPaths` import from `./admit.mjs`. The JSDoc block for `route` (lines 58 to 67) stays above `route`. In `admit.mjs`, delete only the line `/** The project's security path prefixes (config.mjs); kept here because route.mjs imports it from admit. */`; the export stays.

**Done when:**
- **T-1.1** In `route.test.mjs`, a design record whose phase 2 entry has `files: [lib/tidy.mjs]` and `security: true`, under a grant `through: 3` from phase 1, routes phase 2's `PHASE DONE` without writing `phases/2.approved`; `run_through` is cleared, `next` answers `approve_phase` for phase 2, and an `applied` line contains `marked security-sensitive`.
- **T-1.2** `gate.test.mjs` pins fail-closed reading: `security: true`, `security: yes` and `security: "auth"` return kind `security_mark`; `security: false` and an absent key return `null` for a phase with no other input.
- **T-1.3** With `.claude/harness.json` holding `{ "security_paths": ["lib/secure/"] }`, a phase whose frontmatter `files` is `[lib/other.mjs]` but whose `**Touch set:**` lists `` - `lib/secure/key.mjs`: why `` returns kind `security_path` with `lib/secure/key.mjs` in the reason.
- **T-1.4** A phase with a security path and `security: true` and `[IRREVERSIBLE]` returns kind `security_path`; one with `security: true` and `[IRREVERSIBLE]` returns `security_mark`.
- **T-1.5** The existing tests in `route.test.mjs` pass unchanged, including "a run grant never crosses a security path or an irreversible step" and the grant that approves phases 2 and 3 of an unmarked order.
- **T-1.6** `git grep -n phaseNeedsOwnGate -- .claude` prints nothing, and `git diff` on `.claude/lib/admit.mjs` shows exactly one removed line and no added line.
- **T-1.7** `npm test` exits 0.

## Phase 2: `harness next` and the gate packet name the own gate

**Touch set:**
- `.claude/lib/next.mjs`: `own_gate` on every result
- `.claude/lib/packet.mjs`: one gate field line
- `test/kernel/next.test.mjs`: `own_gate` and detail cases
- `test/kernel/packet.test.mjs`: gate line, width, absence

**Changes:** In `next.mjs`, import `ownGate` from `./gate.mjs`. `base` gains `own_gate: null`, so every result has the key. The last return (the order and design `approve_phase`) sets `own_gate: ownGate(id, current.n, root)`; when it is set, `detail` becomes `phase ${n} of ${count} is done and awaits your decision; it ${own_gate.reason}`. The research `approve_phase`, the options and every other branch are unchanged. In `packet.mjs`, inside the order and design `approve_phase` branch, push a `field("gate", ...)` line whose value is "phase", the phase number, `n.own_gate.reason` and "; run grants stop here", directly after the `files` line when `n.own_gate` is set; nothing else moves. The CLI needs no change: `harness next` prints `detail`, and `--json` prints the whole result.

**Done when:**
- **T-2.1** For a design record whose phase 1 entry has `security: true` and phase 1 done, `next()` returns `own_gate` deep-equal to `{ kind: "security_mark", reason: "is marked security-sensitive in the record" }` and a `detail` ending `; it is marked security-sensitive in the record`.
- **T-2.2** For an unmarked done phase, `own_gate` is `null` and `detail` is exactly `phase 1 of 2 is done and awaits your decision`.
- **T-2.3** `next()` results for `write_artifact`, `implement_phase`, `review_cumulative`, `close` and the research `approve_phase` each carry `own_gate: null`.
- **T-2.4** The packet for the T-2.1 record has the line `  gate      phase 1 is marked security-sensitive in the record; run grants stop here`, directly after the `files` line.
- **T-2.5** The packet for a phase whose touch set lists a 120-character path under a configured prefix keeps every line within `WIDTH`.
- **T-2.6** The existing test "the gate packet is fixed-shape, width-capped, and ends with the options" passes unchanged, and its packet has no line starting `  gate`.
- **T-2.7** `npm test` exits 0.

## Phase 3: The template asks for the mark and the prose defers to the kernel

**Touch set:**
- `.claude/skills/documenting/templates/design.md`: `security:` on the phase entry
- `.claude/hooks/lint.schema.mjs`: design entries need a boolean `security`
- `test/hooks/hooks.test.mjs`: lint reports missing and non-boolean
- `.claude/skills/designing/steps/10-design.md`: second save lists `security`
- `.claude/skills/ordering/steps/20-phase.md`: runs follow `harness next`
- `.claude/skills/designing/SKILL.md`: run-grant sentence, line 44
- `.claude/skills/ordering/SKILL.md`: run-grant sentence, line 42
- `.claude/rules/work-items.md`: frontmatter entry names `security`

**Changes:** Template: after the phase 1 entry's `drive:` line, add a `security:` line at the same indent whose placeholder reads "true when the phase changes authentication, authorisation, secret handling, or how the system decides a security concern or when it stops the user; false otherwise", in the template's usual placeholder form; the Phase 2 placeholder comment says a phase with `security: true` or a security path never shares a run grant. `lint.schema.mjs`: inside the `for (const p of fmPhases)` loop, push `phases[n=${p.n}].security must be true or false` when `p.security` is present and not a boolean, or when it is absent and the record is `design.md`. `hooks.test.mjs`: one test with a design record in the `project()` fixture covering an absent key, `security: maybe` and `security: false`. `10-design.md:33`: the list becomes `files`, `greps`, `tests`, `drive`, `security`. `20-phase.md:26` becomes: inside a granted run the phase loop is unchanged (one phase, one block, end the turn); the kernel decides whether the run goes on, and the lead sends the next phase only while `harness next` says `implement_phase`. `20-phase.md:16`: the parenthesis "(or straight to the next phase inside a granted run)" becomes "(or the next phase, inside a granted run, when `harness next` says `implement_phase`)". `designing/SKILL.md:44`: the first sentence becomes "A run grant stops at every phase that takes its own gate; `harness next` and the gate packet name the reason."; the irreversible sentence stays. `ordering/SKILL.md:42`: "except a phase that touches a security path, which always stops" becomes "except a phase that takes its own gate, which always stops; `harness next` names the reason". `work-items.md:11`: the entry is `n`, `files`, optional `greps`, `tests`, `drive`, and `security` (required in design records; `true` gives the phase its own gate, so no run grant crosses it); the must_haves sentence names `files` to `drive` only. No file restates the three gate conditions (D-003).

**Done when:**
- **T-3.1** `lint.schema` on a design record whose phase 1 entry has no `security` key reports `phases[n=1].security must be true or false`; with `security: maybe` it reports the same line; with `security: false` it reports no `security` line.
- **T-3.2** The existing test "lint.schema reports structural problems and the revision protocol", on an order record without `security`, passes unchanged and its output has no `security` line.
- **T-3.3** `git grep -n -e "touch set includes a security path" -e "touches a security path, which" -- .claude/skills` prints nothing.
- **T-3.4** The design template's phase 1 entry has a `security:` line directly after `drive:`, and `.claude/skills/designing/steps/10-design.md` lists `security` among the per-phase keys.
- **T-3.5** `.claude/skills/ordering/steps/20-phase.md` names `harness next` in its run-grant sentence, and `node --test test/budgets.test.mjs` passes.
- **T-3.6** `npm test` exits 0.

## Open questions

- **OQ-001** Should a record-marked phase also set the review summary's `security_path` (`.claude/lib/review.mjs`), so the reviewer loads `.claude/skills/reviewing/steps/30-patterns-security.md` for it as it does for a configured path? Owner: user. Fallback: unchanged in this item; the cross-check reviewer reads the `security` key beside each phase.

## Revision log
