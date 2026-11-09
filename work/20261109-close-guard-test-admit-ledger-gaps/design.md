---
kind: design
lane: design
title: Close guard, test, admit, ledger gaps
date: 2026-11-09
audience: developer
sources: [work/20261109-close-guard-test-admit-ledger-gaps/request.md, work/20261018-fix-follow-ups-from-the-two-items/design.md, work/20261109-stop-admit-misrouting-on-incidental-keywords/design.md, work/20261109-close-verdict-admit-pane-packet-gaps/verdicts.jsonl, bench/.runs/events/fast-15-skip-under-pressure-r1-mw99kvw8.jsonl, .picket/state/guard.log, test/repo/markdown-paths.test.mjs, test/cli/close.test.mjs, test/support/cli.mts, test/support/project.mts, scripts/build.mjs, scripts/test.mjs, scripts/watch.mjs, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/bash.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/powershell.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/hooks/guard/silenced/index.mts, src/lib/hooks/guard/comments/index.mts, src/lib/shared/silenced.mjs, src/lib/shared/comments.mjs, src/lib/shared/review-summary.mts, src/lib/shared/admission/signals.mts, src/lib/shared/admission/admit-labelled.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/hooks/route/verdict/index.mts, src/lib/shared/check-log.mts, src/lib/shared/check-log.test.mts, src/lib/verbs/check/index.mts, src/lib/verbs/packet/packet.mjs, src/lib/shared/git.mts, src/lib/util/io.mts, src/skills/implementing/SKILL.md, test/repo/conventions.test.mjs, docs/how-to.md]
phases:
  - n: 1
    files: [test/repo/markdown-paths.test.mjs]
    greps:
      - path: test/repo/markdown-paths.test.mjs
        pattern: 'UNSCANNED_PREFIXES = \[[^\]]*"\.claude/agent-memory/"'
    tests: true
    drive: false
    security: false
  - n: 2
    files: [scripts/build.mjs, test/repo/build.test.mjs]
    greps:
      - path: scripts/build.mjs
        pattern: 'PICKET_BUILD_OUT'
      - path: scripts/build.mjs
        pattern: 'export function swapInto\b'
      - path: test/repo/build.test.mjs
        pattern: 'swapInto'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/hooks/guard/bash/in-place.mts, src/lib/hooks/guard/bash/in-place.test.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/hooks/guard/bash/bash.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/powershell.mts, docs/how-to.md]
    greps:
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: 'export function inPlaceTargets\b'
      - path: src/lib/hooks/guard/bash/payloads.test.mts
        pattern: 'test/repository\.test\.ts'
      - path: src/lib/hooks/guard/bash/in-place.test.mts
        pattern: 'src/mods/status/hooks/index\.test\.tsx'
    tests: true
    drive: true
    security: true
  - n: 4
    files: [src/lib/shared/admission/signals.mts, src/lib/shared/admission/signals.test.mts, src/lib/shared/admission/admit-labelled.test.json]
    greps:
      - path: src/lib/shared/admission/signals.mts
        pattern: 'credential\|tokens\?\|secret'
        absent: true
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'the verdict token constant'
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: 'never drop table invoices by hand'
      - path: src/lib/shared/admission/signals.test.mts
        pattern: 'Store the token in a cookie after login'
    tests: true
    drive: true
    security: true
  - n: 5
    files: [src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts]
    greps:
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'function repeatsPhaseVerdict\b'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/check-log.mts, src/lib/shared/check-log.test.mts, src/lib/verbs/check/index.mts, src/lib/verbs/check/index.test.mts, src/lib/util/io.mts, src/lib/util/io.test.mts]
    greps:
      - path: src/lib/shared/check-log.mts
        pattern: 'product_changed'
      - path: src/lib/shared/check-log.mts
        pattern: 'export function redBeforeChange\b'
      - path: src/lib/verbs/check/index.mts
        pattern: 'dirtyPaths'
    tests: true
    drive: true
    security: false
  - n: 7
    files: [src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'redBeforeChange'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'no failing picket check before the code changed'
    tests: true
    drive: true
    security: false
  - n: 8
    files: [test/repo/conventions.test.mjs, src/lib/hooks/lint/schema/report.mts, src/lib/shared/commit-message.mts, src/lib/shared/styling/plan.mts, src/lib/shared/work/next-step.test.mts, src/mods/types/index.d.ts]
    greps:
      - path: src/lib/shared/commit-message.mts
        pattern: 'COMMIT_TYPES =\['
        absent: true
      - path: src/lib/hooks/lint/schema/report.mts
        pattern: 'SUMMARY =/'
        absent: true
      - path: src/lib/shared/styling/plan.mts
        pattern: 'ApplyOptions =\{'
        absent: true
      - path: src/lib/shared/work/next-step.test.mts
        pattern: 'AMEND_LINE ="'
        absent: true
      - path: src/mods/types/index.d.ts
        pattern: 'Piece =\{'
        absent: true
    tests: true
    drive: false
    security: false
---
# Design: Close guard, test, admit, ledger gaps

## Problem

Today's runs left seven gaps (`request.md`): shell and script edits of code files skip `guard.silenced` and `guard.comments` (the lead's `sed -i` that added `describe.skip` in bench run fast-15, a developer's Python heredoc on `src/mods/status/hooks/index.test.tsx`); CLI tests fail while another `npm test` rebuilds `dist/`; admit raises security, migration and irreversible signals on the words "verdict token" and on quoted examples; route.verdict records one PHASE DONE twice; the check log grows per run; the Markdown path test reads agent notes written mid-session; and two developer slips (red test after the fix, a lost space after `=`) depend on the agent noticing. The binding constraints are the floor (guards, verdict tokens and lanes unchanged), the 200 ms cold hook budget (`test/timing/budgets.test.mjs`), the earlier rulings that shell writes by the lead stay allowed for code generation (`work/20261018-fix-follow-ups-from-the-two-items/design.md` D-004 (r2)) and that the security signal fails toward design for identifiers (`work/20261109-stop-admit-misrouting-on-incidental-keywords/design.md` D-001), and the brief's out of scope: no bench re-baseline, no commit of the bench result or agent memory.

## Decisions

### D-001: Agent memory is not scanned for paths
**Decision:** Infrastructural decision. `test/repo/markdown-paths.test.mjs` adds `.claude/agent-memory/` to `UNSCANNED_PREFIXES`, beside `work/` and `artifacts/`: agent notes are records an agent writes mid-session, not documentation a user follows. `.claude/MEMORY.md` stays scanned. No `ELSEWHERE` path is cited only from agent memory today (checked over the 77 agent memory files the test scans now), so the test that every elsewhere path is still cited keeps passing.
**Instead of:** scanning only committed agent memory files: a committed note with a stale path would still turn `npm test` red for text nobody reads as documentation.
**Risks:**
- **RISK-001** A broken path in an agent note goes unnoticed. Mitigation: notes are advisory and every memory reader is told to verify a named path before acting on it.

### D-002: The build swaps a staged dist into place
**Decision:** Infrastructural decision. The state the close tests share is `dist/`, not a test folder: every test in `test/cli/close.test.mjs` already takes its own temporary root from `withProject` (`test/support/project.mts:12`) and spawns `dist/bin/picket.mjs` (`test/support/cli.mts:4`), while `scripts/build.mjs:258` removes the whole `dist/` folder and rebuilds it, so a concurrent `npm test` (which `picket check` runs here) leaves a window with no CLI. Run as a script, `scripts/build.mjs` builds into a staging folder `tmp/dist-<pid>` (`tmp/` is gitignored) by running the build as a child process with `PICKET_BUILD_OUT` naming that folder, then moves it into place with `swapInto(staging, target)`: rename `dist` aside, rename the staging folder to `dist`, remove the old copy. With `PICKET_BUILD_OUT` unset, `DIST` stays `<repo>/dist`, so every test import of `scripts/build.mjs` and `scripts/watch.mjs` keep today's paths.
**Instead of:** threading an output folder parameter through the nine build functions that read `DIST`-derived constants: the same result with a wider diff in a file five tests import. Maintenance cost of the choice: the build runs itself as a child process when called as a script.
**Risks:**
- **RISK-002** Windows refuses to rename a folder while a process holds a file open inside it. Mitigation: `swapInto` falls back to remove then rename, today's behaviour with a window of one rename instead of a whole build.
- **RISK-003** An absolute staging path is baked into a built file. Mitigation: T-2.3 searches `dist/` for the staging name.

### D-003: In-place shell edits of code files are denied to every actor
**Decision:** Infrastructural decision. `guard.bash` treats an in-place edit of a project code file (inside the project, outside `.picket/state/`, extension in `LANGS` of `src/lib/shared/comments.mjs`) as a code write for every actor, the lead included: `sed -i` (read today), `perl -i` and `ruby -i` with their file operands, and an interpreter program (`python`, `python3`, `node`, `perl`, `ruby`, `bun`, `deno`) given inline (`-c`, `-e`, `--eval`, `-p`) or on standard input by a heredoc, whose text holds both a file-write call and a quoted literal that resolves to a project code file. The denial reuses `codeWriteDenial` with the dialect's escalation hint, so the user can still approve one such command through `PICKET_ESCALATE`. Redirects, `tee` and the PowerShell writer cmdlets stay denied to spawned agents only, as 20261018 D-004 (r2) decided. Request item 1 allows "the same checks as an Edit, or be denied"; denial keeps the Edit and Write tools the one path where both guards see the before and after text, so `guard.silenced` and `guard.comments` are not changed. Given up: a lead's bulk `sed` rename across code files needs an escalation or Edit with `replace_all`; a script file (`python3 fix.py`), `patch` and `git apply` stay unread (OQ-002).
**Instead of:** rebuilding the after-text of each shell form and running both detectors on it: 20261018 D-004 rejected it for parse cost, and an interpreter program's output cannot be known without running it.
**Risks:**
- **RISK-004** An inline program that writes a data file but names a code file in another string is denied. Mitigation: the reason names the path and the Edit tool, escalation stays open, and T-3.5 pins ordinary reads and state-folder writes as not denied.
- **RISK-005** Scanning heredoc bodies slows the hook. Mitigation: two fixed regexes per interpreter segment; the cold budget test runs in phase 3.

### D-004: Admit masks quoted prose and reads a bare token as a credential only beside a credential word
**Decision:** Infrastructural decision. In `src/lib/shared/admission/signals.mts`, the security, migration and irreversible tests read the request with every quoted span that holds whitespace (a quoted example, sentence or command) blanked; a one-word quoted span (an identifier such as `password`) stays, so security still fails toward design for identifiers as the earlier D-001 requires. The bare word token leaves `SECURITY`: a token counts as a credential only when a credential word (session, access, bearer, api, auth, jwt, oauth, cookie, login, refresh, sign in or log in) sits in the same sentence once the never-credential phrases of `NOT_A_CREDENTIAL` are removed. Today one credential word anywhere re-arms every token (`signals.mts:73`), which is how "verdict token" with "mid-session" elsewhere read as authentication. Measured on a scratch copy of the rule: the 145 corpus entries and 18 bench prompts answer the same lanes as on base (7 corpus misses before and after).
**Instead of:** counting a token only with a qualifier directly before it (access token, session token): "Store the token in a cookie after login." would lose its security signal.
**Risks:**
- **RISK-006** A real migration quoted as a command (`ALTER TABLE invoices ADD ...` in backticks) with no migration word outside the quote loses the signal. Mitigation: no corpus entry or bench prompt has that shape; security paths and `--touched` still escalate; the user can force `lane: design`.

### D-005: A repeated phase verdict with no row between adds no row
**Decision:** Infrastructural decision. `route.verdict` stops before routing when the incoming verdict carries a phase and the last row of `verdicts.jsonl` has the same agent, verdict, phase and scope: it re-saves a developer's newer block, as the continued-stop rule does today (`src/lib/hooks/route/verdict/index.mts:155`), and returns one line saying the verdict is already recorded. A row between the two (a user rejection, a reviewer verdict) makes the repeat new work, routed as today. Verdicts with no phase (AMENDED, ARTIFACT WRITTEN, REPORT WRITTEN) keep today's rules. The incident is rows 3 and 4 of `work/20261109-close-verdict-admit-pane-packet-gaps/verdicts.jsonl`: PHASE DONE for phase 1, 11 s apart, from a re-sent block whose text differed, so `repeatsSavedBlock` did not match it.
**Instead of:** widening `repeatsSavedBlock` to compare blocks loosely: no text rule tells a re-sent block from a real second report, while the verdict log already says nothing happened in between.
**Risks:**
- **RISK-007** A developer re-sends a block after a real fix with no row between. Mitigation: the newer block is saved and the gate packet reads it, so the user sees the latest report.

### D-006: The check log keeps two rows per item phase
**Decision:** Infrastructural decision. `appendCheckRow` rewrites `.picket/state/check-log.jsonl` through a temporary file and a rename, keeping per (`work_id`, `phase`) the newest row and the newest failing row recorded while no product code file had changed; rows of other item phases stay. Each row gains `product_changed`: true when the checkout's `dirtyPaths` hold a file with a `LANGS` extension that is neither a test path (`isTestPath` of `src/lib/shared/silenced.mjs`) nor bookkeeping (`isNonProduct` of `src/lib/shared/git.mts`). `latestCheck` answers as before; a new reader `redBeforeChange` returns the kept red row. The log then grows with item phases, not with runs.
**Instead of:** a cap on the row count: no input sets the cap, and a cap would drop the red row that D-007 reads.
**Risks:**
- **RISK-008** Two checks rewrite the log at the same moment and one row is lost. Mitigation: the packet then shows the block's own Tests: line or "not reported", and the next check writes a fresh row.

### D-007: Red-first is shown at the gate, not bounced
**Decision:** Infrastructural decision. When a developer block's `Red:` line reports a failure (`<test> failed: <line>`) and the check log holds no red-before-change row for that phase, the gate packet's `red` field adds `(no failing picket check before the code changed)`. The evidence is the kernel's own log, written by `picket check`, which `picket:implementing` step 2 already tells the developer to run before touching the code. The user decides at the gate.
**Instead of:** bouncing the developer's stop: by then the fix is in the tree, and showing the red again means moving the fix aside with `git stash`, which the guard sends to the permission prompt.
**Risks:**
- **RISK-009** A real red run made after an unrelated product edit in the same phase still gets the note. Mitigation: the note says what the log shows, beside the block's own `Red:` text.

### D-008: Assignment spacing is a repository convention scan
**Decision:** Infrastructural decision. `test/repo/conventions.test.mjs` gains a scan of tracked code files under `src/`, `test/`, `scripts/` and `bench/`: after `maskStrings` and line-comment removal, a line where a word character, `)` or `]`, a space and `=` are followed by a character that is not `=`, `>`, whitespace or the end of the line is reported. `npm test`, which `picket check` runs in this repository, then fails on `=(argv` and `=new URL`. Five such lines exist on base; phase 8 fixes them.
**Instead of:** a spacing check that picket ships to host projects: those projects bring their own formatter, which `picket check` already runs as its lint step.
**Risks:**
- **RISK-010** A string form `maskStrings` does not mask (a multi-line template literal) is reported. Mitigation: the scan's samples pin the masked forms; a report names file and line.

## Scope
**In:**
- `test/repo/markdown-paths.test.mjs` scope (D-001)
- `scripts/build.mjs` staging and swap (D-002)
- `guard.bash` in-place forms and actor rule, and the matching row of `docs/how-to.md` (D-003)
- admission signals, their tests and the labelled corpus (D-004)
- `route.verdict` repeat rule (D-005)
- check log rows, compaction and the red reader (D-006), and the gate packet's red note (D-007)
- the spacing scan and the five lines it finds (D-008)

**Out:**
- committing `bench/results/plugin-2026-11-09.json` or agent memory files; re-baselining the bench
- lanes, verdict tokens, `guard.silenced` and `guard.comments` code
- the fast lane's red-first evidence; unquoted mentions of signal names in a request

## Phase 1: Agent memory leaves the Markdown path scan
**Touch set:**
- `test/repo/markdown-paths.test.mjs`: unscanned prefixes and their test
**Changes:** Add `.claude/agent-memory/` to `UNSCANNED_PREFIXES` (D-001). In the test "records are not scanned", add the agent memory assertions below; leave `ELSEWHERE` as it is.
**Done when:**
- **T-1.1** `isScanned(".claude/agent-memory/picket-architect/MEMORY.md")` and `isScanned(".claude/agent-memory/picket-developer/guard-bash-code-writes.md")` return false, asserted in the "records are not scanned" test.
- **T-1.2** `isScanned(".claude/MEMORY.md")`, `isScanned("README.md")` and `isScanned("src/skills/ordering/SKILL.md")` still return true, asserted in the same test.
- **T-1.3** `node --test test/repo/markdown-paths.test.mjs` passes, the elsewhere test included, with the uncommitted agent memory notes that `git status` lists at the phase start still in the working tree.

## Phase 2: The build swaps a staged dist into place
**Touch set:**
- `scripts/build.mjs`: output root, staging, swap
- `test/repo/build.test.mjs`: swap and default output tests
- `test/support/cli.mts`: read only, spawns the built CLI
- `scripts/watch.mjs`: read only, calls `buildAll` directly
**Changes:** As D-002. `DIST` resolves to `PICKET_BUILD_OUT` when that variable is set, else `<repo>/dist`; every `DIST`-derived constant follows it unchanged. Add `export function swapInto(staging: string, target: string): void`: when `target` exists it is renamed to a sibling of `staging` (`<staging>-old`), `staging` is renamed to `target`, and the old copy is removed; when a rename fails (Windows `EPERM` or `EBUSY`, or a concurrent swap that moved `target` first), it removes `target` and renames `staging` once more. The script entry (the `process.argv[1]` block) creates `tmp/dist-<pid>`, runs `node scripts/build.mjs` as a child with `PICKET_BUILD_OUT` set to it, and on exit code 0 calls `swapInto(staging, DIST)`; on failure it removes the staging folder and exits non-zero with the child's message. The child (variable set) runs `buildAll` as today. `scripts/watch.mjs`, `writeMarketplace` and `writeReferencePages` keep their paths.
**Done when:**
- **T-2.1** A unit test in `test/repo/build.test.mjs` with temporary folders: `target` holds `old.txt`, `staging` holds `new.txt`; after `swapInto(staging, target)`, `target` lists exactly `new.txt`, and neither `staging` nor `<staging>-old` exists.
- **T-2.2** The same test with no `target` folder: `swapInto` leaves `target` holding `new.txt` and no `staging`.
- **T-2.3** After `node scripts/build.mjs`, `dist/bin/picket.mjs` exists, no folder matches `tmp/dist-*`, and `grep -rl "tmp/dist-" dist` prints nothing.
- **T-2.4** With `PICKET_BUILD_OUT` unset, `test/repo/build.test.mjs`, `test/repo/package.test.mjs`, `test/repo/mods.test.mjs`, `test/repo/hook-list.test.mjs` and `test/repo/claude-launcher.test.mjs` pass with their imports of `scripts/build.mjs` unchanged.
- **T-2.5** Drive. Before the first edit, on base 81f08bb, run `node --test test/cli/close.test.mjs` three times while a background loop runs `node scripts/build.mjs` ten times, and record each run's pass count (the before-image; request item 2 reports 4 failures of 35). After the change, the same drive passes 35 of 35 in all three runs.
- **T-2.6** `npm test` passes.

## Phase 3: In-place shell edits of code files are denied to every actor
**Touch set:**
- `src/lib/hooks/guard/bash/in-place.mts`: new, interpreter and `-i` targets
- `src/lib/hooks/guard/bash/in-place.test.mts`: new, target tests
- `src/lib/hooks/guard/bash/payloads.mts`: write targets carry their form
- `src/lib/hooks/guard/bash/judge.mts`: in-place denial for every actor
- `src/lib/hooks/guard/bash/bash.mts`: `shellText` keeps every heredoc body
- `src/lib/hooks/guard/bash/rules.mts`: `Reading` gains heredoc bodies
- `src/lib/hooks/guard/bash/powershell.mts`: PowerShell reading, no heredocs
- `src/lib/hooks/guard/bash/payloads.test.mts`: lead rows of the T-2.4 test
- `docs/how-to.md`: the code-write denial row (line 414)
**Changes:** As D-003. `ShellText` gains `heredocs: string[]`, every heredoc body in order, quoted delimiters included; `Reading` gains `heredocs` (empty for PowerShell). New module `in-place.mts` exports `inPlaceTargets(seg: Segment, heredocs: readonly string[]): string[]`, the raw operands an in-place segment writes: the file operands of `perl` or `ruby` with an `-i` flag cluster (`-i`, `-i.bak`, `-pi`), and for an interpreter root the quoted literals (no whitespace inside) of its program text when that text matches a write call (`.write(`, `write_text(`, `writeFileSync(`, `writeFile(`, `appendFileSync(`, `File.write`, an `open(` with a `w`, `a` or `+` mode). The program text is the value after `-c`, `-e`, `-E`, `--eval`, `-p` or `deno eval`, or, when the segment names no script file (no operand, or `-`), the command's heredoc bodies. In `payloads.mts` a code write becomes `{ rel: string; inPlace: boolean }`: `sed -i` and `inPlaceTargets` hits are in place, also when reached through `sh -c`, `eval` or an argv wrapper; redirects, `tee` and PowerShell writers are not. `judge.mts` denies an in-place code write for every actor with `codeWriteDenial` and the escalation path it uses today, and keeps the spawned-agent rule for the rest. The how-to row says a shell edit in place (`sed -i`, `perl -i`, an inline script) is denied to everyone and a redirect to agents.
**Done when:**
- **T-3.1** The bench command `sed -i 's/^describe("JsonInvoiceRepository"/describe.skip("JsonInvoiceRepository"/; s/^describe("MemoryInvoiceRepository"/describe.skip("MemoryInvoiceRepository"/' test/repository.test.ts && git diff --stat && picket check --human` is denied for the lead (no agent) and for `picket:developer`, with a reason starting `guard.bash: test/repository.test.ts is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool.`
- **T-3.2** `python3 - <<'EOF'` with the body `p='src/mods/status/hooks/index.test.tsx'`, `s=open(p,encoding='utf-8').read()`, `open(p,'w',encoding='utf-8').write(s.replace('a','b'))` and `EOF` is denied for the lead and the developer, the reason naming `src/mods/status/hooks/index.test.tsx`.
- **T-3.3** For the lead, `perl -pi -e 's/a/b/' src/a.ts`, `node -e "require('fs').writeFileSync('src/a.mts', 'x')"`, `python3 -c "open('src/a.py', 'w').write('x')"` and `sh -c "sed -i s/a/b/ src/a.ts"` are each denied, the reason naming its path.
- **T-3.4** For the lead, `echo x >> src/a.ts`, `printf x | tee -a src/a.py`, `cat > test/kernel/x.test.mjs <<'EOF'` (body `x`) and PowerShell `Set-Content src/a.ts x` get no decision, as on base; for the developer they stay denied.
- **T-3.5** For both actors, none of these is a code-write denial: `python3 -c "import json,sys; print(json.load(sys.stdin))"`, `node --test test/cli/close.test.mjs`, a `python3 - <<'EOF'` body that reads and writes `.claude/agent-memory/picket-developer/notes.md`, `node -e "require('fs').writeFileSync('.picket/state/scratch/a.mjs', 'x')"`, `sed -n '1,5p' src/a.ts`.
- **T-3.6** `PICKET_ESCALATE="the user asked" sed -i 's/a/b/' src/a.ts` from the lead gets the decision the developer's escalated `sed -i` gets on base.
- **T-3.7** Drive. A PreToolUse payload (Bash, no `agent_type`, the T-3.1 command) piped into `node dist/hooks/guard.bash.mjs` prints `"permissionDecision":"deny"` with the T-3.1 reason; the same payload on base, captured before the first edit, prints no deny.
- **T-3.8** `node --test test/timing/budgets.test.mjs` passes, the cold hook budget included.

## Phase 4: Admit masks quoted prose and gates a bare token
**Touch set:**
- `src/lib/shared/admission/signals.mts`: security, migration, irreversible inputs
- `src/lib/shared/admission/signals.test.mts`: token and quoted cases
- `src/lib/shared/admission/admit-labelled.test.json`: three pinned requests
- `src/lib/shared/admission/admit-labelled.test.mts`: read only, the share and exact tests
- `bench/test/tasks.test.mjs`: read only, bench prompt lanes
**Changes:** As D-004. `signalsOf` computes one masked text: each `QUOTED` span holding whitespace replaced by a space, one-word spans kept; `touchesSecurity`, `isMigration` and the irreversible test read it, every other signal reads the request as today. Remove `tokens?` from `SECURITY`; add `cookies?` and `login` to `CREDENTIAL_CONTEXT`; replace `withoutNonCredentialTokens` with a test that is true when one sentence (split at `.`, `!`, `?` or `;` followed by whitespace, or a line break) holds the word token after `NOT_A_CREDENTIAL` phrases are removed and also matches `CREDENTIAL_CONTEXT`. Add the three corpus entries of T-4.4 with lane `fast` and a `why`.
**Done when:**
- **T-4.1** `signalsOf("Fix the verdict token check in route.verdict so a session that stops without one is bounced.", [], [], DEFAULT_SECURITY_PATHS).security` is false (true on base).
- **T-4.2** `security` stays true for "Store the token in a cookie after login.", "Store the session token in an httpOnly cookie.", "Rotate the access token the server uses to call the tax service every hour." and "Rename `password` to `passwordHash` in src/config.ts.".
- **T-4.3** `migration` is false for `Document the example "run the migration and backfill the schema" in the admit tests.` (true on base); `irreversible` stays true for the unquoted "See if we can drop table legacy_users safely.".
- **T-4.4** The corpus holds three entries labelled `fast`, each with the fixture path `src/http/handlers.ts` in backticks: "Rename the verdict token constant in (path); the login session flow is unchanged.", "Fix the typo in the error text "run the migration first" in (path)." and "Fix the typo in the hint "never drop table invoices by hand" in (path)."; each answers `fast` (design on base, measured on a scratch copy), so the exact test for fast entries naming a fixture file pins them.
- **T-4.5** Every other corpus entry answers the lane it answered on base 81f08bb (the 145 answers captured before the first edit are the before-image; 7 disagree with their labels before and after), and `node --test bench/test/tasks.test.mjs` passes.
- **T-4.6** Drive. `picket admit --request -` with the request text of `work/20261109-close-verdict-admit-pane-packet-gaps/request.md` up to its `PICKET_REQUEST_END` line prints `"security":false`; on base, captured before the first edit, it prints `"security":true`.

## Phase 5: A repeated phase verdict adds no row
**Touch set:**
- `src/lib/hooks/route/verdict/index.mts`: repeat check before routing
- `src/lib/hooks/route/verdict/index.test.mts`: repeat cases
- `src/lib/shared/work/verdict-log.mts`: read only, `readVerdicts` rows
**Changes:** As D-005. Add `repeatsPhaseVerdict(rows: VerdictRow[], incoming: { agent: string; verdict: string; phase: number | undefined; scope: string | undefined }): boolean`, true when `phase` is defined and the last row has the same agent, verdict, phase and scope. In `routeTurn`, after the saved-block and commit-bounce checks, compute the agent and scope as `applyVerdict` does (extract that computation so both read one function); when `repeatsPhaseVerdict` holds, save a developer's block and return a context line `picket: <verdict> for <id> phase <n> is already recorded; the newer block is saved. Run \`picket next <id>\`.` on a stop that was not continued, and nothing on a continued one. The continued-stop rule for verdicts without a phase stays.
**Done when:**
- **T-5.1** A developer stop (not continued) with PHASE DONE for phase 1, after a last row of developer PHASE DONE phase 1 and with a block whose `Tests:` line differs, leaves the row count of `verdicts.jsonl` unchanged, leaves `phases/1.block.md` holding the newer block, and returns the already-recorded line.
- **T-5.2** A reviewer APPROVED for phase 1 with scope `phase`, sent twice with no row between, leaves one row.
- **T-5.3** After a user `rejected` row for phase 1, the developer's PHASE DONE for phase 1 adds a row and routes as on base.
- **T-5.4** A second AMENDED (no phase) right after an AMENDED row, on a stop that was not continued, adds a row as on base.
- **T-5.5** PHASE DONE for phase 2 after PHASE DONE for phase 1 adds a row.
- **T-5.6** Drive. On a scratch copy of an item at phase 1, two SubagentStop payloads (`agent_type` `picket:developer`, the same `## Phase 1 of <id>: <title>` block, the second with a changed `Tests:` line) piped into `node dist/hooks/route.verdict.mjs` with `CLAUDE_PROJECT_DIR` on the scratch copy leave one PHASE DONE row; on base the same drive leaves two (the before-image).

## Phase 6: The check log keeps two rows per item phase
**Touch set:**
- `src/lib/shared/check-log.mts`: row field, compaction, red reader
- `src/lib/shared/check-log.test.mts`: round-trip tests
- `src/lib/verbs/check/index.mts`: compute `product_changed` at log time
- `src/lib/verbs/check/index.test.mts`: field from a temporary repository
- `src/lib/util/io.mts`: atomic JSONL rewrite
- `src/lib/util/io.test.mts`: rewrite test
- `src/lib/shared/git.mts`: read only, `dirtyPaths`, `isNonProduct`
- `src/lib/shared/silenced.mjs`: read only, `isTestPath`
**Changes:** As D-006. `CheckRow` gains `product_changed: boolean`. `io.mts` gains `rewriteJsonl(path: string, rows: readonly object[]): void`, writing `<path>.<pid>.tmp` and renaming it over `path`. `appendCheckRow` reads the rows, adds the new one, keeps, for every (`work_id`, `phase`) key, the newest row and the newest row with `ok` false and `product_changed` false, and rewrites the kept rows in file order. Add `redBeforeChange(root, id, phase): CheckRow | null`, the newest row of that key with `ok` false and `product_changed === false`; a row without the field is never a red. In the check verb, `logCheck` sets `product_changed` from `dirtyPaths` of the checkout directory: true when a path has a `LANGS` extension and is neither `isTestPath` nor `isNonProduct`.
**Done when:**
- **T-6.1** Appending through `appendCheckRow` for (A, 2) a failed row with `product_changed` false, a failed row with true, then two passed rows with true, interleaved with one row each for (A, 3) and (B, 2), leaves exactly the first and the last (A, 2) rows plus the two other rows.
- **T-6.2** After T-6.1, `latestCheck(root, A, 2)` returns the last row and `redBeforeChange(root, A, 2)` returns the first.
- **T-6.3** `redBeforeChange` returns null when every failing row of the key has `product_changed` true, and for a row written without the field.
- **T-6.4** After an append, `.picket/state/` holds no `*.tmp` file.
- **T-6.5** The check verb logs `product_changed` true when `src/a.ts` is dirty in a temporary git repository, and false when only `test/a.test.ts` and `work/<id>/order.md` are dirty.
- **T-6.6** Drive. In a scratch project with an open item bound to the session, six runs of `picket check --only "<command>"` (two failing, four passing) leave at most two rows for that item phase in `.picket/state/check-log.jsonl`.

## Phase 7: The gate packet notes a red without a logged red
**Touch set:**
- `src/lib/verbs/packet/packet.mjs`: red field note
- `test/kernel/packet.test.mjs`: red note cases
- `src/lib/shared/work/block.mts`: read only, `blockField`
**Changes:** As D-007. When the block's `Red:` value reports a failure (it holds `failed` and starts with neither `pinned:` nor `n/a:`) and `redBeforeChange(root, id, n.phase)` is null, the `red` field prints the value followed by ` (no failing picket check before the code changed)`. Every other case prints today's field.
**Done when:**
- **T-7.1** At `approve_phase`, a block with `Red: test/fee.test.ts failed: expected 1.05, got 1.04` and no logged rows prints the red field `test/fee.test.ts failed: expected 1.05, got 1.04 (no failing picket check before the code changed)`.
- **T-7.2** With a failed row with `product_changed` false appended through `appendCheckRow` for that item phase, the red field prints the block text only.
- **T-7.3** `Red: pinned: test/name.test.ts` and `Red: n/a: new endpoint` print the block text only, with or without logged rows.
- **T-7.4** A block with no `Red:` line prints no red field, as on base.
- **T-7.5** Drive. `picket packet <id>` on a scratch item at `approve_phase` with such a block and no red row prints the note; after one failing `picket check` run with only a test file dirty, it prints the block text alone.

## Phase 8: The spacing scan and the five lines it finds
**Touch set:**
- `test/repo/conventions.test.mjs`: assignment spacing scan and samples
- `src/lib/shared/comments.mjs`: read only, `maskStrings`
- `src/lib/hooks/lint/schema/report.mts`: line 16, `SUMMARY =/`
- `src/lib/shared/commit-message.mts`: line 3, `COMMIT_TYPES =[`
- `src/lib/shared/styling/plan.mts`: line 10, `ApplyOptions ={`
- `src/lib/shared/work/next-step.test.mts`: line 118, `AMEND_LINE ="`
- `src/mods/types/index.d.ts`: line 3, `Piece ={`
**Changes:** As D-008. A scan over `git ls-files src test scripts bench` code files (`.mts`, `.mjs`, `.ts`, `.tsx`, `.js`, `.cjs`, `.cts`, `.jsx`, declaration files included): each line through `maskStrings`, its `//` comment removed, reported when it matches a word character, `)` or `]`, then ` =`, then a character other than `=`, `>` or whitespace. The report names `file:line`. Put one space after `=` on the five base lines.
**Done when:**
- **T-8.1** The scan reports `const isUnlink =(argv: readonly string[]) => argv[0] === 'node'`, `const REVIEWING_SKILL =new URL("../../SKILL.md", import.meta.url);` and `export type Piece ={ text: string }`, and reports none of `a === b`, `const f = (x) => x`, `const s = "a =b";`, `const x =` ending its line, `if (a <= b) n += 1;`, `const r = /a =b/;`, `// a =b`.
- **T-8.2** Over the tracked code it reports nothing; on base it reports exactly the five touch-set lines (the before-image).
- **T-8.3** `npm test` passes.

## Open questions
- **OQ-001** Request item 2 says close tests share state on disk and need their own temporary folders; the code shows each already has one (`test/support/project.mts:12`) and that the shared state is `dist/`, removed and rebuilt by `scripts/build.mjs:258`. Owner: the user. Fallback: phase 2 as written; if the T-2.5 before-image shows no failure on base, the developer says so on the block.
- **OQ-002** Script files run by an interpreter (`python3 fix.py`), `patch` and `git apply` stay outside the in-place denial, since the guard cannot read what they write. Owner: the user. Fallback: unread; the review summary still lists silenced moves in reviewed lanes, and the fast lane has no backstop.
- **OQ-003** Unquoted mentions of signal names still raise the signals: the request of `work/20261109-close-verdict-admit-pane-packet-gaps/` keeps migration and irreversible from "an irreversible step or a migration", and this item's request keeps all three. Owner: the user. Fallback: unchanged; the request names only quoted examples and the word token.

## Revision log
