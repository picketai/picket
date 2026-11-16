---
name: machine-node-and-test-runs
description: Windows host has no Node 22; parallel test probes fail when dist is rebuilt; picket check runs the full npm test; mods step green again since f39277ec; tclsh and mawk installed, php, lua, R, gawk absent; Linux host has Podman 5.7.0 (picked over a denied docker) whose pasta AppArmor profile blocks Compose up
metadata:
  type: reference
---

Seen 2026-10-23 (item 06 design):

- nvm under the APPDATA nvm folder holds v12, v14, v18, v20.11.1 and v24.22.1, no Node 22. A Node 22 floor check needs `npx -y node@22.x` (npm listed 22.23.4) or CI; see [[fake-node-version]] for faking an old version instead.
- A parallel `node --test` over the test folder took 33.2 s on 16 cores, budgets alone 2.8 s. Seven spawn tests failed with "Cannot find module dist/bin/picket.mjs" because another agent rebuilt the dist folder during the run (no test rebuilds it). Rerun before blaming parallelism.
- To check whether the src folder runs without a build, copy it and package.json into the scratchpad, apply the import change there, and import every module with a probe file written by the Write tool (guard.bash refuses an .mjs written through a shell heredoc and compound commands holding rm).

Seen 2026-11-08 on the Linux host (/mnt/work path): `grep` resolves to ugrep, which refuses long `.{0,N}` patterns on the Claude binary ("exceeds complexity limits"); use `LC_ALL=C /usr/bin/grep -a -o`. `git` is not on the agent shell's PATH, so `picket preflight` reports "not a git repository" though the folder is one. Copying the built dist folder into the scratchpad was denied by the permission prompt, so plugin layout probes there need the user.

By 2026-11-08 later, `/usr/bin/git` is on the agent PATH. `picket check <id>` runs the whole `npm test`, build included, so it rewrites dist under other agents.

On the Linux host, `node --version` is v26.13.0 (2026-11-08), and it runs a scratchpad `.mts` probe that imports `src/lib/shared/admission/lane.mts` and its siblings directly, with no build. The CLAUDE.md budget is back at 2048 bytes in `test/timing/budgets.test.mjs` (read 2026-11-13; CLAUDE.md was 2022), and the injected rule text budget is 10000 chars (9760 used on 2026-11-13). `picket verify <id> <n>` with `tests: true` runs the whole `npm test` too, build included.

Until 43ee39c (2026-11-08) `npm test` failed on the Linux host in its `mods` step only: 25 status pane and band tests, because the status fixtures use `D:/` roots, which are relative on Linux (see [[mod-engine-api-facts]]). Since 43ee39c the whole `npm test` passes there, so a criterion that `npm test` passes can be met again.

Fixed by f39277ec (item 20261113-mods-match-the-host-hook-types, closed 2026-11-14), so a plain "`npm test` passes" criterion is usable again; recount if the host upgrades. History: on 2026-11-14 under 2.1.325 still 27, and `claude plugin test dist` run alone failed 2 of 137 band tests (item 20261113-mods-match-the-host-hook-types fixes both). Red again on 2026-11-13 under Claude Code 2.1.323: the `mods` step (`claude plugin validate --strict dist`) prints 27 `error TS` lines on the base b8b414e9, while unit, build, product and timing exit 0. Write a "tests pass" criterion as those four steps at `exit 0` plus the `error TS` count unchanged, until a mods fix or a Claude Code upgrade; recount first.

On the Linux host, later on 2026-11-14: Podman 5.7.0 and Docker 29.1.3 are installed, Compose 2.40.3 at `/usr/libexec/docker/cli-plugins/docker-compose` (the provider of `podman compose`). `docker info` exits 1 (socket permission denied), so `findEngine` picks Podman, and `scripts/test.mjs` now runs the env step for real. Rootless Podman cannot start a container on a user-defined network (every Compose `up`): runroot is `/mnt/work/development/containers/podman/run`, outside the pasta AppArmor profile's write paths (`/run/user/<uid>/**`, `/tmp/**`, owner home), so pasta fails "Couldn't open PID file ... Permission denied". Check with `podman network create x && podman run --rm --network x docker.io/library/busybox:1.36 true` before writing a real-engine criterion. Probe env verbs without editing src by importing the verb `.mts` files from a scratch probe with a logging runner. `curl` reaches raw.githubusercontent.com for third-party docs.

Interpreters on the Linux host (2026-11-15): `tclsh` (8.6), `awk`, `mawk` 1.3.4 and `nawk` are installed; `php`, `lua`, `luajit`, `R`, `Rscript`, `gawk`, `pypy3` and `nodejs` are absent, so a premise about their flags rests on manuals and becomes an OQ. Run a write probe in a fresh scratch subfolder; a compound command holding `rm` is denied by guard.bash.

Stdin paths (2026-11-16): `python3`, `tclsh` and `mawk -f` run a program from `/dev/stdin`, `/dev/fd/0` and `/proc/self/fd/0`; Node 26 fails `node /dev/stdin` fed a piped heredoc (realpath of `pipe:[...]`) unless `--preserve-symlinks-main` is given.
