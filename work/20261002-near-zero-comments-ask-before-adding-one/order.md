---
kind: order
lane: order
title: Near-zero comments, ask before adding one
date: 2026-10-02
audience: developer
sources: [request, .claude/scripts/lint.craft.mjs, .claude/hooks/guard.scope.mjs, .claude/hooks/guard.block.mjs, .claude/hooks/route.verdict.mjs, .claude/hooks/observe.drive.mjs, .claude/hooks/README.md, .claude/settings.json, .claude/lib/work.mjs, .claude/lib/packet.mjs, .claude/lib/route.mjs, .claude/lib/next.mjs, .claude/bin/harness.mjs, .claude/agents/developer.md, .claude/agents/architect.md, .claude/agents/reviewer.md, .claude/skills/reviewing/SKILL.md, .claude/skills/reviewing/steps/10-alignment.md, .claude/skills/ordering/steps/20-phase.md, .claude/skills/ordering/steps/30-gate.md, .claude/skills/expediting/SKILL.md, .claude/skills/expediting/steps/30-check.md, .claude/rules/harness-authoring.md, test/budgets.test.mjs, test/hooks/hooks.test.mjs, test/kernel/packet.test.mjs, test/kernel/cli.test.mjs, CLAUDE.md]
phases:
  - n: 1
    files: [.claude/lib/comments.mjs, .claude/hooks/guard.comments.mjs, .claude/settings.json, .claude/hooks/guard.scope.mjs, .claude/lib/work.mjs, .claude/bin/harness.mjs, .claude/scripts/lint.craft.mjs, .claude/hooks/README.md, test/kernel/comments.test.mjs, test/hooks/hooks.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: .claude/settings.json
        pattern: "guard\\.comments\\.mjs"
      - path: .claude/hooks/guard.scope.mjs
        pattern: "comments\\W+jsonl"
      - path: .claude/bin/harness.mjs
        pattern: "case .comment.:"
      - path: .claude/lib/work.mjs
        pattern: "export function approvedComments"
      - path: .claude/scripts/lint.craft.mjs
        pattern: "lib/comments\\.mjs"
      - path: .claude/hooks/README.md
        pattern: "guard\\.comments\\.mjs"
    tests: true
    drive: true
  - n: 2
    files: [.claude/rules/comments.md, CLAUDE.md, .claude/agents/architect.md, .claude/skills/reviewing/steps/10-alignment.md]
    greps:
      - path: .claude/rules/comments.md
        pattern: "harness(\\.mjs)? comment"
      - path: CLAUDE.md
        pattern: "`comments` \\(always\\)"
      - path: .claude/agents/architect.md
        pattern: "rules/comments\\.md"
      - path: .claude/skills/reviewing/steps/10-alignment.md
        pattern: "comments\\.jsonl"
    tests: true
    drive: false
  - n: 3
    files: [.claude/agents/developer.md, .claude/lib/packet.mjs, test/kernel/packet.test.mjs, .claude/skills/ordering/steps/30-gate.md, .claude/skills/expediting/SKILL.md, .claude/skills/expediting/steps/30-check.md]
    greps:
      - path: .claude/agents/developer.md
        pattern: "^Comments: "
      - path: .claude/lib/packet.mjs
        pattern: "\\[k\\] keep comment"
      - path: .claude/skills/ordering/steps/30-gate.md
        pattern: "harness(\\.mjs)? comment"
      - path: .claude/skills/expediting/SKILL.md
        pattern: "^Comments: "
      - path: .claude/skills/expediting/steps/30-check.md
        pattern: "harness(\\.mjs)? comment"
    tests: true
    drive: false
---
# Order: Near-zero comments, ask before adding one

## Problem

The developer keeps adding comments: the incident produced four `<remarks>` blocks and two reworded `<summary>` lines because the order put "XML doc text" in scope and every floor the teammates read exempts doc comments (`.claude/skills/reviewing/steps/10-alignment.md:49`) or treats comments as rare rather than banned (`.claude/skills/expediting/SKILL.md:33`). Cm1 to Cm3 are Minor and Major never blocks `APPROVED` (`.claude/skills/reviewing/SKILL.md:87`), and five rejections show prose alone does not hold. The user wants close to zero comments, and for the rare why-comment on a specific value or condition, a question to the user before it is written. The fix must stand inside this harness, with no dependency on a target project's language rule.

## Decisions

### D-001: Deny at the edit, not at the end of the turn
**Decision:** A new PreToolUse hook on `Write|Edit`, `.claude/hooks/guard.comments.mjs`, denies any edit whose text adds a comment line to a code file. Added means: comment lines in `new_string` that are not in `old_string` (Edit), or comment lines in `content` that are not in the file on disk (Write), compared as a multiset of normalised bodies, so a moved or kept comment never counts. It works on the tool payload alone: no git, no repo resolution, no contract heading, so it covers the developer, the lead in the fast lane and nested clones the same way. The deny reason names the file and the comment text and says what to do instead (drop it; propose it when it is a why for a specific value or condition).
**Instead of:** a SubagentStop bounce on `git diff --cached` when the `## Phase N of` block lands: it fires only after the whole phase is written, misses the fast lane (the lead's turn has no developer heading), and must work out which repo a nested clone stages in.
**Risks:**
- **RISK-001** A file written through Bash (a heredoc, `sed -i`) skips the hook. Mitigation: the developer contract already forbids Bash rewriting files and `guard.bash` prompts redirections; the reviewer floor (D-005) reports any comment that lands anyway.
- **RISK-002** A multi-line template literal or string fixture that contains `//` or `#` reads as a comment and is denied. Mitigation: the detector masks single-line strings as `lint.craft.mjs` does today; the deny reason quotes the text, so the author builds such fixtures from single-line strings joined with `"\n"`.
- **RISK-003** One more node start per Write or Edit. Mitigation: the hook reads approval records only when it has found an added comment, and `test/budgets.test.mjs` holds it under 200 ms cold.

### D-002: One comment detector, shared with lint.craft, with no doc-comment exemption
**Decision:** The extension table, comment-token parsing, string masking and exemption markers move out of `.claude/scripts/lint.craft.mjs` into `.claude/lib/comments.mjs`, a pure module (no file or git access). It exports the table, the existing per-line `commentOf`, and `commentLines(text, ext)`, which returns the non-exempt comment bodies of a text with block state carried across lines. Every comment form counts, doc comments included: `//`, `///`, `/* */` and `*` continuation lines, `#`, `--`, `'`, a line-leading `"""` or `'''` in Python, and HTML-style block comments (`<!` followed by `--`) in markup (`.html .htm .xml .xaml .cshtml .razor .vue .svelte`). Exempt, and only these: the existing `DIRECTIVE_MARKERS` (machine directives such as `eslint-disable`, `noqa`, `#pragma`, `SuppressMessage`; licence, copyright and SPDX headers; generated-file banners; shebang and encoding lines). Docs and data files (`.md .json .yaml .yml .toml`, Dockerfile, project files) are not scanned. `lint.craft.mjs` imports the shared pieces and keeps its own rules and output.
**Instead of:** a fresh parser inside the hook and `lint.craft.mjs` left as it is: two extension tables and two exemption lists drift apart, against the one-copy rule in `.claude/rules/harness-authoring.md`.
**Risks:**
- **RISK-004** The move changes what `lint.craft.mjs` reports. Mitigation: it keeps its own doc-comment skip and rule logic; T-1.6 compares its counts on a fixed range before and after.

### D-003: An approved comment is a kernel-owned record, matched by path and text
**Decision:** Approvals live in `work/<id>/comments.jsonl`, one JSON line per approved comment: `{ ts, path, text }`, `path` repo-relative with forward slashes, `text` the comment body without its token. Only the kernel writes it: `harness comment <id> --path <p> --text "<t>"` appends a line through `appendComment(id, entry, root)` in `.claude/lib/work.mjs`, next to `appendVerdict`, and `guard.scope` adds the file to its kernel-owned list. `approvedComments(root)` returns the entries of every work item whose status is `open` or `blocked`. The hook lets an added comment line through when its normalised body (token stripped, whitespace collapsed, trimmed) equals a line of an approved `text` for the same path. The record rides into the phase commit with the rest of `work/<id>/`, so an approval is visible in history and in the review diff.
**Instead of:** an inline allow marker in the code, the `craft-lint-allow:` pattern lint.craft uses: the marker is itself a comment a model can write without asking, which is the hole this work closes.
**Risks:**
- **RISK-005** Any agent with Bash can run `harness comment` and approve its own comment. Mitigation: the same trust boundary as `harness route --agent user` today; the developer contract forbids it (Phase 3) and the entry shows in the committed `work/<id>/comments.jsonl` the reviewer reads.

### D-004: The ask path is a field on the existing block, not a new verdict
**Decision:** A developer that needs a why-comment does not write it. Its `PHASE DONE` block carries `Comments: <path>:<line> "<text>"; <path>:<line> "<text>" | none`, which `parseBlock` already collects as a field. `harness packet` renders the proposals numbered under a `comments` label and appends `[k] keep comment <n>` to the options. A `k <n>` reply runs `harness comment` with that proposal's path and text and sends the developer `comment approved: <path>:<line> "<text>"`; the developer writes exactly that text, re-stages, and re-emits `PHASE DONE`, and a fresh packet follows. An `a` reply with proposals pending drops them: no comment is the default. The fast lane carries the same `Comments:` line on its `## Expedited` block and the same `k <n>` reply.
**Instead of:** a new verdict token or a stop such as `PHASE STALLED` with a question: a token means `route.mjs`, `next.mjs` and both Stop hooks change for a case the user wants to be rare, and a stall blocks the item.
**Risks:**
- **RISK-006** A kept comment costs one extra developer turn and a second packet for that phase. Mitigation: accepted by design; it happens only when the user says yes to a comment.

### D-005: One always-loaded rule; contracts carry only their role's step
**Decision:** The policy lives once, in `.claude/rules/comments.md` (no `paths:` frontmatter, so every agent and the lead load it, as `prose.md` is). Contracts point at it and add only what their role does: the architect never puts doc text or "document X in code" in a phase's scope and routes such needs to an external document; the developer follows the ask path (Phase 3); the reviewer's floor replaces Cm1 to Cm3 with one Major check for an added comment without an approval record, keeps the stale-comment check, and drops the doc-comment exemption. The analyst contract is not edited.
**Instead of:** the same paragraph in all four agent contracts, as the request proposes: four copies drift and cost lines against the 120-line agent budget, while the rule already reaches every agent. An always-loaded rule costs about 1 KB on every turn of every session; path-scoping it by code globs would need a glob list that drifts from the detector's table.

## Scope

**In:**
- The detector module, the guard hook and its wiring, the approval record and its verb (Phase 1)
- The rule, the CLAUDE.md rules line, the architect constraint and the reviewer floor (Phase 2)
- The ask path in the developer contract, the gate packet, the order gate, and the fast lane block (Phase 3)

**Out:**
- `.claude/skills/reviewing/templates/patterns.md`: no file in the harness loads it (grep finds no reference), so it is not edited
- `.claude/agents/analyst.md`: the analyst writes no code and the always-loaded rule reaches it
- Removing comments that already exist anywhere
- A `lint.schema` check that rejects doc-text wording in orders: the hook makes such scope unimplementable, and the check would trip on orders like this one
- Restricting who may run `harness comment` (RISK-005)
- The target project's `csharp.md`

## Phase 1: Detector, guard hook and approval record

**Touch set:**
- `.claude/lib/comments.mjs`: new shared comment detector
- `.claude/hooks/guard.comments.mjs`: new PreToolUse deny hook
- `.claude/settings.json`: wire hook on Write, Edit
- `.claude/hooks/guard.scope.mjs`: make comments.jsonl kernel-owned
- `.claude/lib/work.mjs`: appendComment and approvedComments
- `.claude/bin/harness.mjs`: new `comment` verb, usage
- `.claude/scripts/lint.craft.mjs`: import shared table and markers
- `.claude/hooks/README.md`: one row for the hook
- `test/kernel/comments.test.mjs`: detector unit tests
- `test/hooks/hooks.test.mjs`: hook deny and allow cases
- `test/kernel/cli.test.mjs`: comment verb writes the record

**Changes:** Create `.claude/lib/comments.mjs` per D-002 by moving `LANGS`, `l`, `extOf`, `maskStrings`, `commentOf` and `DIRECTIVE_MARKERS` out of `lint.craft.mjs`, extending the table with the markup extensions and Python docstrings, and adding `commentLines(text, ext)` and a `normalise(body)` helper. Add `addedComments({ ext, before, after })`, the multiset difference D-001 describes, so the hook stays a thin shell.

Create `.claude/hooks/guard.comments.mjs` on the `guard.scope.mjs` pattern: read the payload, resolve the repo-relative path with `projectRoot(data.cwd)`, take `before` from `old_string` (Edit) or the file on disk (Write, empty when new) and `after` from `new_string` or `content`, and exit 0 when the extension is not scanned or nothing is added. When comments are added, load `approvedComments(root)`, drop the approved ones, and deny the rest with `permissionDecision: "deny"` and a reason starting `guard.comments:` that quotes up to three bodies and says: code carries the meaning, remove the comment; a why for a specific value or condition goes on the block's `Comments:` line for the user to decide. Exit 0 on any internal failure, as every hook does. Wire it in `.claude/settings.json` under the existing `Write|Edit` PreToolUse matcher, after `guard.scope.mjs`.

In `.claude/lib/work.mjs` add `appendComment(id, { path, text }, root)` (writes `{ ts, path, text }` to `work/<id>/comments.jsonl`, `path` normalised to forward slashes) and `approvedComments(root)` (entries of open and blocked items, each tagged with its `id`). In `harness.mjs` add `case "comment"`: `comment <id> --path <p> --text "<t>"`, both flags required, unknown id fails through `readState`, prints the entry as JSON, `--human` prints one line. Add it to the header usage and the unknown-verb list. In `guard.scope.mjs` add `comments\.jsonl` to the kernel-owned regex on line 32 and to its header list.

Test fixtures that hold comment text are built from single-line strings joined with `"\n"` (RISK-002); this phase's own code adds no comments.

**Done when:**
- **T-1.1** An Edit payload whose `new_string` adds `// sum the totals`, `/// <remarks>Why</remarks>`, `# note` (in a `.py` file) or an HTML-style comment around `note` (in a `.html` file) is denied by `guard.comments.mjs` with a reason starting `guard.comments:`; one test per form in `test/hooks/hooks.test.mjs`.
- **T-1.2** The same hook returns nothing (allows) for: an Edit that keeps an existing comment unchanged, an added `// eslint-disable-next-line`, an added `// SPDX-License-Identifier: MIT`, a `.md` or `.yaml` file with `#` or HTML-style comment lines, and a string literal `"// not a comment"`.
- **T-1.3** After `harness comment <id> --path src/fee.ts --text "half-up: the tariff table is published that way"` on an open item, an Edit adding `// half-up: the tariff table is published that way` to `src/fee.ts` is allowed, the same line added to `src/other.ts` is denied, and once the item is `done` the line is denied again.
- **T-1.4** `harness comment` without `--path` or `--text` exits 1, and with both it appends one line with `ts`, `path`, `text` to `work/<id>/comments.jsonl` (`test/kernel/cli.test.mjs`).
- **T-1.5** `guard.scope.mjs` denies a direct Write to `work/<id>/comments.jsonl`.
- **T-1.6** `lint.craft.mjs` holds no `LANGS` or `DIRECTIVE_MARKERS` definition of its own, and `node .claude/scripts/lint.craft.mjs --range 69d7300..5e19bb5 --json` reports the same error and candidate counts before and after the move (both counts on the block's `Decisions:` line).
- **T-1.7** `npm test` passes, including the 200 ms cold-start budget for the new hook.
- **T-1.8** Drive: `harness drive --run "node .claude/bin/harness.mjs comment 20261002-near-zero-comments-ask-before-adding-one --path src/x.ts --text probe"` prints the JSON entry and the drive restores the record it wrote.

## Phase 2: The rule, the architect constraint and the reviewer floor

**Touch set:**
- `.claude/rules/comments.md`: new always-loaded policy rule
- `CLAUDE.md`: list the rule as always loaded
- `.claude/agents/architect.md`: no doc text in scope
- `.claude/skills/reviewing/steps/10-alignment.md`: replace Cm1 to Cm3, drop exemption

**Changes:** Create `.claude/rules/comments.md` with no frontmatter `paths:`, under 30 lines, following `prose.md`. It says, in this order: write no new comments in code, names, types, small functions and tests carry the meaning; this covers every form, doc comments included (XML `<summary>`, `<remarks>`, `<param>`, `<returns>`, `<example>`, JSDoc, docstrings, markup comments); the only exempt lines are machine directives, licence and SPDX headers, generated-file banners, shebang and encoding lines; a request or plan that asks to "document" behaviour is never a licence for comments, that text goes to an external document (a change list, or an API reference through `documenting api`); the one exception is a why for a specific value or condition the code cannot show, and it is never written but proposed (path, line, text) for the user, and only a recorded approval (`harness comment`) lets it past `guard.comments`; an existing comment the change makes stale is fixed or deleted. One concrete example with a real value, such as `const ROUNDING = 0.5` with the tariff reason.

In `CLAUDE.md` add `` `comments` (always) `` to the rules line; the file stays under 2048 bytes. In `architect.md` add one line under `## Constraints`: a phase never carries doc text, code comments or "document X in code" as scope (`.claude/rules/comments.md`); such needs become an external document or an open question.

In `10-alignment.md` replace rows Cm1 to Cm3 with one row: Cm1, unapproved comment, the diff adds a comment of any form (doc comments included) that is not exempt and has no matching entry in `work/<id>/comments.jsonl`, Major, reported as one aggregated finding listing each `path:line` and text. Keep the stale-comment row, renumbered Cm2. Delete "required doc comments on public API (XML docs, JSDoc, docstrings)" from the never-flag list; keep the rest. Update the lint.craft paragraph on line 64 to the new Cm ids, and add one sentence: `guard.comments` blocks comments at the edit, so a Cm1 finding names a bypass.

**Done when:**
- **T-2.1** `.claude/rules/comments.md` exists, has no `paths:` frontmatter, names `harness comment`, and lists `<remarks>` among the covered forms.
- **T-2.2** `CLAUDE.md` lists `` `comments` (always) `` and `test/budgets.test.mjs` passes (CLAUDE.md at most 2048 bytes, rule at most 60 lines, agent shells at most 120 lines).
- **T-2.3** `architect.md` carries one constraint line naming `.claude/rules/comments.md` and forbidding doc text as phase scope.
- **T-2.4** `10-alignment.md` has exactly two Cm rows, Cm1 is Major and names `comments.jsonl`, and `grep -c "required doc comments" .claude/skills/reviewing/steps/10-alignment.md` prints 0.
- **T-2.5** `npm test` passes.

## Phase 3: The ask path at the gate

**Touch set:**
- `.claude/agents/developer.md`: ask path, `Comments:` block field
- `.claude/lib/packet.mjs`: render proposals, add `[k]` option
- `test/kernel/packet.test.mjs`: proposal rendering tests
- `.claude/skills/ordering/steps/30-gate.md`: `k <n>` reply row
- `.claude/skills/expediting/SKILL.md`: craft bar line, block field
- `.claude/skills/expediting/steps/30-check.md`: `k <n>` reply row

**Changes:** In `developer.md` add to `## Constraints`: never write a comment (`.claude/rules/comments.md`), `guard.comments` denies it; when a specific value or condition needs a why the code cannot show, leave it out and propose it on the `Comments:` line; never run `harness comment` yourself; on `comment approved: <path>:<line> "<text>"` write exactly that text there in the file's comment form, re-stage, and re-emit the block. Add `Comments: <path>:<line> "<text>"; … | none` to the output block after `Decisions:`. Phase loop step 1 stops pointing at a "craftsmanship bar above" that the file does not contain.

In `packet.mjs` add a `commentLines` renderer beside `decisionLines`: split the `comments` field on `; `, skip `none`, number each proposal (`1 src/fee.ts:42 "half-up: …"`), cut each to the width, at most three lines plus a `+k more in the phase block` line. Render them under a `comments` label after `decisions`, and when there is at least one, append `[k] keep comment <n>` to the options line in the packet only; `next.mjs` stays unchanged.

In `30-gate.md` add a reply row: `k <n>`, `keep <n>`: run `harness comment <id> --path <p> --text "<t>"` with proposal n's values, then `SendMessage` the developer `work: <id>`, `phase: <n>`, `comment approved: <path>:<line> "<text>"`; the next `PHASE DONE` brings a fresh packet. Add one sentence: `a` with proposals pending drops them. In `expediting/SKILL.md` change the craft bar's "comments explain why and are rare" to "no new comments (`.claude/rules/comments.md`)", add `Comments: <path>:<line> "<text>" | none` to the `## Expedited` block, and `[k] keep comment <n>` to its options line when there are proposals. In `30-check.md` add the matching `k <n>` row: record with `harness comment`, write the comment, re-stage, re-print the block.

The packet is exercised through `packet()` in its unit test, the same function the verb prints. No work item with a done phase exists to drive it, so the block records `no drivable surface`. After the contract change, run `node bench/run.mjs --harness rework --tasks lane:fast --runs 1` and compare with `node bench/report.mjs bench/results/baseline-trunk.json <new>`, as `harness-authoring.md` asks.

**Done when:**
- **T-3.1** A saved block with `Comments: src/fee.ts:42 "half-up: the tariff table is published that way"` renders a `comments` line starting `1 src/fee.ts:42` and an options line ending `[k] keep comment <n>`; a block with `Comments: none` renders neither (`test/kernel/packet.test.mjs`).
- **T-3.2** Every packet line stays at most 100 characters with four proposals, and the fourth shows as `+1 more in the phase block`.
- **T-3.3** `developer.md` output block has a `Comments:` line, its constraints forbid running `harness comment`, and it no longer contains "craftsmanship bar above".
- **T-3.4** `30-gate.md` and `expediting/steps/30-check.md` each have a `k <n>` reply row that runs `harness comment <id> --path <p> --text "<t>"`.
- **T-3.5** `grep -c "comments explain why and are rare" .claude/skills/expediting/SKILL.md` prints 0, and its `## Expedited` block has a `Comments:` line.
- **T-3.6** `npm test` passes, including the agent, skill and step line budgets.

## Open questions

- **OQ-001** Does the ban cover the harness's own source (`.claude/**`, `test/**`), whose existing files carry header comments? Owner: user. Fallback: yes; the hook judges every code file in the project, and existing comments stay untouched.
- **OQ-002** Should YAML, TOML, Dockerfile and project files (`.csproj`, `.props`) be scanned too? Owner: user. Fallback: no; only the code and markup extensions in D-002 are scanned.

## Revision log
