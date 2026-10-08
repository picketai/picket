---
kind: order
lane: order
title: Lane check survives quotes in arguments
date: 2026-10-08
audience: developer
sources: request.md; lead context (code.claude.com/docs/en/skills.md, "Inject dynamic context" and "Pass arguments to skills", as summarised by the lead); core/skills/{designing,expediting,ordering,researching}/SKILL.md; core/bin/tether.mjs:49 to 70; bench/adapters/plugin.mjs; claude --help (2.1.292)
phases:
  - n: 1
    files:
      - core/skills/designing/SKILL.md
      - core/skills/expediting/SKILL.md
      - core/skills/ordering/SKILL.md
      - core/skills/researching/SKILL.md
      - test/skills/lane-check.test.mjs
    greps:
      - path: core/skills/ordering/SKILL.md
        pattern: tether admit --request - --human
      - path: core/skills/ordering/SKILL.md
        pattern: <<'TETHER_REQUEST_END'
      - path: core/skills/designing/SKILL.md
        pattern: tether admit --request - --human
      - path: core/skills/designing/SKILL.md
        pattern: <<'TETHER_REQUEST_END'
      - path: core/skills/expediting/SKILL.md
        pattern: tether admit --request - --human
      - path: core/skills/expediting/SKILL.md
        pattern: <<'TETHER_REQUEST_END'
      - path: core/skills/researching/SKILL.md
        pattern: tether admit --request - --human
      - path: core/skills/researching/SKILL.md
        pattern: <<'TETHER_REQUEST_END'
    tests: true
    drive: false
  - n: 2
    files:
      - core/skills/designing/SKILL.md
      - core/skills/expediting/SKILL.md
      - core/skills/ordering/SKILL.md
      - core/skills/researching/SKILL.md
      - test/skills/lane-check.test.mjs
    tests: true
    drive: true
---
# Order: Lane check survives quotes in arguments

## Problem

The four lane skills inject `!`tether admit --text "$ARGUMENTS" --human`` to re-check the lane. Claude Code substitutes `$ARGUMENTS` unescaped before it runs the command, so a request holding a backtick or a double quote becomes a shell syntax error, and an injected command failure aborts the whole skill invocation (`|| true` does not help: it tolerates a non-zero exit, not a parse error). Example: `/tether:ordering Add a `tether close <id>` verb...` failed today with "unexpected EOF while looking for matching `"'". The kernel side already works: `printf 'Add a `x` with "q" and $HOME\n' | tether admit --request - --human` prints `lane: order (...)`, and an empty stdin prints `lane: (none) ...` with exit 0.

## Decisions

### D-001 [withdrawn]: the request reaches tether admit through a quoted heredoc in a fenced block
**Withdrawn:** in Phase 2 the permission check refused the injected heredoc in a real run, so D-002 applied; the lane check is now a prose step.
**Decision:** Each of the four SKILL.md files replaces its inline `!` line with the documented multi-line form:

    ```!
    tether admit --request - --human <<'TETHER_REQUEST_END'
    $ARGUMENTS
    TETHER_REQUEST_END
    ```

A quoted heredoc delimiter turns off every expansion in the body, so backticks, double and single quotes, `$HOME` and `$(whoami)` reach `tether admit` as literal text, and the request no longer sits inside a shell string that a quote can close. The surrounding "Lane check for this request:" line and the routing sentence after it stay as they are.
**Instead of:** escaping inside the inline span (for example single quotes around `$ARGUMENTS`): any quote style is closed by the same quote character in the request, so it moves the failure without removing it.
**Risks:**
- **RISK-001** A request line that is exactly `TETHER_REQUEST_END` ends the heredoc early and the rest runs as commands. Mitigation: the delimiter is a token no request plausibly holds on a line by itself; the unit test pins the delimiter so a rename is deliberate.
- **RISK-002** Whether Claude Code ends the ```` ```! ```` fence early at a backtick run inside the substituted arguments is undocumented. Mitigation: Phase 2's real invocation carries a backtick; a request holding a triple-backtick run is listed as out of scope unless the probe shows it survives.

### D-002: if the fenced form fails the real invocation, the line becomes a prose step
**Decision:** If Phase 2's headless invocation shows the fenced form aborting or not running, the four SKILL.md files drop the injected command and say instead: "If this conversation has no `tether admit` answer for the request yet, run `tether admit --request - --human` with the request on stdin through a quoted heredoc." The model writes that Bash call itself, quoting correctly, and CLAUDE.md step 1 already runs `tether admit` before a lane skill loads in the usual flow, so the injected line is only a re-check for a direct `/tether:<lane>` call.
**Instead of:** keeping the inline line with a warning to users to avoid quotes: a skill that aborts on ordinary request text (a backticked identifier) is the defect being fixed.

### D-003: a free unit test simulates the substitution; the paid proof is a one-time phase drive
**Decision:** `test/skills/lane-check.test.mjs` reads each lane SKILL.md, extracts the ```` ```! ```` block, replaces `$ARGUMENTS` with hostile text the way Claude Code does (plain string replacement), runs it with `bash -c` and `--root` pointing at a temp folder, and asserts `lane:` output with exit 0. It runs in `npm test` at no cost. The real `claude -p` invocation runs once in Phase 2 from a temp project, and its command and output go into the phase block; it is not committed as a script.
**Instead of:** a committed probe under `bench/` that calls `claude -p`: it spends quota on every run and adds a maintained script for a one-time proof that the unit test then guards for free.

## Scope

**In:** the four lane SKILL.md lane-check lines, the unit test, one real headless proof.
**Out:** other skills' `$ARGUMENTS` uses (they are prose, not injected commands); `tether admit` itself; requests holding a line equal to the heredoc delimiter or a triple-backtick run (RISK-001, RISK-002).

## Phase 1: Fenced heredoc lane check

**Touch set:**
- `core/skills/designing/SKILL.md`: fenced heredoc lane check
- `core/skills/expediting/SKILL.md`: fenced heredoc lane check
- `core/skills/ordering/SKILL.md`: fenced heredoc lane check
- `core/skills/researching/SKILL.md`: fenced heredoc lane check
- `test/skills/lane-check.test.mjs`: simulate substitution, run bash

**Changes:** Per D-001, replace the inline `!` line in each file with the four-line fenced block. Per D-003, add the test. Its hostile request is exactly: ``Add a `tether close <id>` verb, say "done", keep $HOME and $(whoami) literal, it's fine``. It asserts, for each of the four files, that bash exits 0, stdout starts with `lane: `, and that the same text with the old inline line substituted in exits non-zero (the control that shows the test detects the defect). A second run of the same block with `tether admit --request - --human` replaced by `cat` shows exactly what stdin carries. An empty `$ARGUMENTS` prints `lane: (none)` with exit 0.

**Done when:**
- **T-1.1** `grep -rn 'admit --text "\$ARGUMENTS"' core/skills` prints nothing.
- **T-1.2** Each of the four SKILL.md files holds the fenced block with `tether admit --request - --human <<'TETHER_REQUEST_END'`, `$ARGUMENTS` and `TETHER_REQUEST_END` on their own lines.
- **T-1.3** `node --test test/skills/lane-check.test.mjs` passes, with the hostile request giving `lane: order` for all four files and the old inline form failing in the control.
- **T-1.4** In the `cat` run, stdout equals the hostile request plus one trailing newline, byte for byte, so `$HOME` and `$(whoami)` arrive unexpanded.
- **T-1.5** `npm test` passes, including `test/budgets.test.mjs`.

## Phase 2: Prove it with one real headless invocation

**Touch set:**
- `core/skills/designing/SKILL.md`: D-002 fallback only, if needed
- `core/skills/expediting/SKILL.md`: D-002 fallback only, if needed
- `core/skills/ordering/SKILL.md`: D-002 fallback only, if needed
- `core/skills/researching/SKILL.md`: D-002 fallback only, if needed
- `test/skills/lane-check.test.mjs`: D-002 fallback only, if needed

**Changes:** In a temp folder outside the repo (`git init`, empty `work/`), run once: `claude -p "/tether:ordering Add a \`tether close <id>\` verb, say \"done\", keep \$HOME literal" --plugin-dir <abs path to core> --model haiku --max-budget-usd 0.25 --output-format stream-json --verbose --disallowedTools Agent,Write,Edit --no-session-persistence`. Expected spend: under $0.25, capped by the flag; the gate quotes this figure before the phase starts. If print mode does not expand the slash command, run once more with the prompt `Invoke the tether:ordering skill with these args: <same text>` under the same cap (worst case $0.50 total). Read the stream for the injected output. If the fenced form fails, apply D-002 to the four files, make the test assert the prose step instead of the block, and run the same command once more (worst case $0.75 total).

**Done when:**
- **T-2.1** The phase block quotes the exact `claude -p` command(s) run and the reported cost of each, total at most $0.75.
- **T-2.2** The stream of the passing run contains the line `lane: order (` from the injected command, and contains neither `unexpected EOF` nor `syntax error`.
- **T-2.3** That stream shows the request text reaching the skill with the backtick, the double quote and `$HOME` intact.
- **T-2.4** If D-002 was applied: `grep -rn '```!' core/skills/{designing,expediting,ordering,researching}/SKILL.md` prints nothing and each file names `tether admit --request - --human`; otherwise the four files are unchanged in this phase.
- **T-2.5** `npm test` passes.

## Open questions

none

## Revision log

- 2026-10-08: D-001 [withdrawn]: permission check refused the injected heredoc in a real run; D-002 applied; phase 1 greps now match the prose lane-check line.
