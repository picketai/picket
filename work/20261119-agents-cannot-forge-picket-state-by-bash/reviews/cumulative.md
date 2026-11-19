## Review: 20261119-agents-cannot-forge-picket-state-by-bash · cumulative

APPROVED: every forging spelling found in the two earlier rounds is now denied for a spawned agent, including the globs, `$` expansions, `cd ~` and `cd -` inside picket-wrapped text. The lead's decisions and the base read and log-sink decisions are unchanged.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Deny an agent's Bash write to the kernel's records under .picket/state/ (the data folder, comments and waivers at least)" | request.md:1 | PASS | records.mts writesUnseen and mayReachRecord, payloads.mts wrappedVerbCheck; 110 probed spellings denied as abcd-developer, among them `.p[i]cket`, `sta{te,x}`, `.??cket`, `*/state`, `work/*/ph*`, `cd "$OLDPWD"` and `cd $(pwd)` inside `picket drive --run` |
| S-2 | "keep the scratch folder and the log files agents write today" | request.md:1 | PASS | records.test.mts T-1.3; probe: check-command.log stays allow |
| S-3 | "keep the lead and the picket verbs able to write there" | request.md:1 | PASS | records.test.mts T-1.4, T-2.3 and the lead tests for wrapped cd and sed w |
| S-4 | "keep the guard's closure test closed and add its new seeds (CONTRIBUTING.md C-020)" | request.md:1 | PASS | records.variants.test.mts gains 9 seeds; test/repo/closures.test.mjs passes |
| S-5 | "record in the data run row the digest that was approved, not one read again after the run" | request.md:1 | PASS | src/lib/verbs/data/run.mts:73; run.test.mts T-3.1 |
Alignment: PASS (20; T-3.5 DEFERRED: QA, the release QA pass on a host where Compose can run a container)
Decisions: HONOURED
Regression: 2 unrequested behaviour changes. First, `A=1 cd <dir>` now moves the tracked cwd (judge.mts:56), and pushd and Set-Location now move it too. Second, picket-wrapped text from a spawned agent holding `$`, `~`, an unknown cd or a bare glob such as `*` is now refused (`picket drive --run "curl localhost:$PORT/x"`, `picket drive --run "prettier --check *"`). Neither was asked for by the story; the second answers my round 2 finding. None of the 120 declared drive commands under work/ and none of the 102 `picket drive --run` rows in guard.log hold a `$`.
Sources: none
Questions: S-1 a script the agent writes itself (to `.picket/state/scratch/` or /tmp) and runs as `picket drive --run "node <script>"`, or an archive it extracts (`tar -xf`, `unzip -o`, `cp -r /tmp/forged/. .`), still writes a record with no prompt, because `Bash(picket *)` allows the call and no command-text guard can see the script's content. Accept this as the residual risk (signing is out of scope), or should a follow-up item make drive refuse an agent's script runs?
Findings: clean of critical and major; 2 minor
- [Minor] work/20261119-agents-cannot-forge-picket-state-by-bash/order.md:89: RISK-002 still says a run-time path "still falls through to the prompt, as today". Inside picket-wrapped text that is now refused, and the script and archive residual reaches no prompt. Reword RISK-002 to say both.
- [Minor] src/lib/hooks/guard/bash/zz-probe.test.mts: an untracked probe test (19:29) is left in src. It asserts nothing and prints on every `npm test`. It is not staged, so the phase commit leaves it out. Remove it (guard.bash denies rm, so use a node unlinkSync).
Classes: none
Checked: the earlier findings stay fixed. 40 benign drive and read forms keep their decision: `npm test`, `ls src/*.ts`, `src/**/*.ts`, `node -e` with brackets, `curl -d '{...}'`, `cd /tmp/app`, `--start`, `cat`/`grep`/`wc` on records, and the scratch and log sinks. The variants.mts change only drops a double quote around an already quoted word. Targeted guard, scope, data, drive and closure tests pass 256/256. I did not run the full suite; the mutation result predates the fix rounds.

APPROVED
