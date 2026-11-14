---
kind: design
lane: design
title: Env verbs pass on real engine
date: 2026-11-14
audience: developer
sources: work/20261114-env-verbs-pass-on-real-engine/request.md; preflight.txt; src/lib/shared/env/engine.mts; src/lib/shared/env/trial.mts; src/lib/shared/env/purge.mts; src/lib/shared/env/stacks.mts; src/lib/shared/env/build-plan.mts; src/lib/verbs/env/check.mts, start.mts, stop.mts, trial.mts, purge.mts, status.mts; test/fixtures/env/fake-engine.mjs; test/env/model.engine.mjs; test/env/lifecycle.engine.mjs; test/cli/env.test.mjs; src/lib/shared/env/engine.test.mts; scripts/test.mjs; src/lib/verbs/drive/run.mts; src/lib/verbs/verify/index.mts; SDR 00004; probes on Podman 5.7.0 with Compose 2.40.3 run 2026-11-14
phases:
  - n: 1
    files:
      - src/lib/shared/env/engine.mts
      - src/lib/shared/env/engine.test.mts
      - test/fixtures/env/fake-engine.mjs
      - test/env/fake-engine.test.mjs
    greps:
      - path: test/fixtures/env/fake-engine.mjs
        pattern: "unknown flag: "
      - path: test/fixtures/env/fake-engine.mjs
        pattern: "unknown shorthand flag: '"
      - path: test/fixtures/env/fake-engine.mjs
        pattern: '"--profile"'
    tests: true
    drive:
      - covers: T-1.3
        command: node test/fixtures/env/fake-engine.mjs compose --project-directory test/fixtures/env/umbrella/.picket/env -f test/fixtures/env/umbrella/.picket/env/compose.yaml config --format json --profile picket-data
        exit_code: 1
        contains:
          - "unknown flag: --profile"
      - covers: T-1.4
        command: node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella
        exit_code: 0
        contains:
          - "engine: podman (Linux containers, Compose 2.40.3"
          - "rules passed"
      - covers: T-1.5
        command: node --test test/env/model.engine.mjs
        exit_code: 0
        contains:
          - "# pass 1"
          - "# fail 0"
    security: false
  - n: 2
    files:
      - src/lib/shared/env/engine.mts
      - src/lib/shared/env/engine.test.mts
      - src/lib/shared/env/trial.mts
      - src/lib/shared/env/purge.mts
      - src/lib/verbs/env/start.mts
      - src/lib/verbs/env/stop.mts
      - src/lib/verbs/env/status.mts
      - test/fixtures/env/fake-engine.mjs
      - test/fixtures/env/podman-stderr/config-unknown-flag.txt
      - test/fixtures/env/podman-stderr/up-pasta.txt
    greps:
      - path: src/lib/shared/env/engine.mts
        pattern: "export function failureCause\\("
      - path: src/lib/shared/env/engine.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/shared/env/trial.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/shared/env/purge.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/verbs/env/start.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/verbs/env/stop.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/verbs/env/status.mts
        pattern: "\\blastErrorLine\\b"
        absent: true
      - path: src/lib/shared/env/trial.mts
        pattern: "failureCause\\("
      - path: src/lib/shared/env/purge.mts
        pattern: "failureCause\\("
      - path: src/lib/verbs/env/start.mts
        pattern: "failureCause\\("
      - path: src/lib/verbs/env/stop.mts
        pattern: "failureCause\\("
      - path: src/lib/verbs/env/status.mts
        pattern: "failureCause\\("
      - path: test/fixtures/env/fake-engine.mjs
        pattern: "Error: executing "
    tests: true
    drive:
      - covers: T-2.5
        command: node test/fixtures/env/fake-engine.mjs compose --project-directory test/fixtures/env/umbrella/.picket/env -f test/fixtures/env/umbrella/.picket/env/compose.yaml config --format json --profile picket-data
        exit_code: 1
        contains:
          - "unknown flag: --profile"
          - "Error: executing /usr/libexec/docker/cli-plugins/docker-compose"
    security: false
  - n: 3
    files:
      - test/fixtures/env/fake-engine.mjs
      - test/env/fake-engine.test.mjs
    tests: true
    drive:
      - covers: T-3.1
        command: node scripts/test.mjs build env
        exit_code: 0
        contains:
          - "env: exit 0"
      - covers: T-3.3
        command: test -z "$(podman ps -a -q --filter label=com.docker.compose.project=picket-trial)$(podman volume ls -q --filter label=com.docker.compose.project=picket-trial)$(podman network ls -q --filter label=com.docker.compose.project=picket-trial)$(podman image ls -q --filter label=io.github.picketai.item=trial)"
        exit_code: 0
      - covers: T-3.5
        command: node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella
        exit_code: 0
        contains:
          - "engine: podman (Linux containers, Compose 2.40.3"
          - "rules passed"
    security: false
---
# Design: Env verbs pass on real engine

## Problem

`picket env check`, `trial` and `start` all read the Compose model through `readModelJson` (`src/lib/shared/env/engine.mts:180`), which puts `--profile picket-data` after the `config` subcommand. Compose 2.40.3 refuses every global flag placed after a subcommand (verified for `config`, `version`, `build`, `up`, `stop`, `down` and `port`, with `-p`, `-f`, `--profile` and `--project-directory`), so the first engine call of every env verb fails on a real engine, while the fake engine (`test/fixtures/env/fake-engine.mjs`) strips value flags wherever they sit and accepted the wrong order. The refusal then shows only Podman's wrapper line (`Error: executing /usr/libexec/docker/cli-plugins/docker-compose ...: exit status 1`), because `lastErrorLine` keeps the last stderr line and Podman's compose wrapper always writes its own line last. A probe on 2026-11-14 that moved the profile flag in front of the subcommand showed the next fault: `compose up` fails for every stack on this machine with `Couldn't open PID file /mnt/work/development/containers/podman/run/networks/rootless-netns/rootless-netns-conn.pid: Permission denied`, because the configured Podman runroot resolves outside the three write paths the pasta AppArmor profile allows; that is host configuration, not Picket code (OQ-001). The binding constraints are SDR 00004 D-003 (Compose, run by Docker or Podman, each engine behind an adapter) and the item's purpose: the real-engine tests pass on this machine.

## Decisions

### D-001: Compose global flags sit in one slot before the subcommand

**Decision:** Infrastructural decision. Every Compose call the adapter builds has the shape `compose <global flags> <subcommand> <subcommand arguments>`. `composeArgs` already builds it for `-p`, `--project-directory` and `-f`; `composeOutput` gains the same slot, and `readModelJson` passes its profile flags there, after the files and before `config`: `compose --project-directory <dir> -f <dir>/compose.yaml --profile picket-data config --format json`. The probe proved this order reads a model equal to `test/fixtures/env/compose-config.json` on Podman 5.7.0 (`readModel` of both, contexts made relative, compared equal).
**Instead of:** enabling profiles through the `COMPOSE_PROFILES` environment variable: it keeps the argv untouched, but `EngineRunner` takes no environment, so it would widen the runner type and every test runner for one call.
**Risks:**
- **RISK-001** A later call adds a global flag after its subcommand again. Mitigation: D-002 makes the fake refuse it, so the unit and CLI tests fail at once.

### D-002: The fake engine parses Compose arguments the way Compose does

**Decision:** Infrastructural decision. The fake reads `compose`, then global flags (`-p`, `-f`, `--project-directory`, `--profile`, each with a value) until the first other word, which is the subcommand. A global flag after the subcommand makes it exit 1 with empty stdout and Compose's own text on stderr: `unknown flag: --profile`, `unknown flag: --project-directory`, `unknown shorthand flag: 'p' in -p`, `unknown shorthand flag: 'f' in -f` (texts read from Compose 2.40.3 on this machine). Answers match on the subcommand words alone, so `compose config --format json` answers the recorded model only when `--profile picket-data` sat in the global slot. The same rule covers every later fault (D-005): the fake first refuses what the real engine refused.
**Instead of:** a unit test that pins the argv order of `readModelJson` alone: it catches this call, but not the next call site that makes the same mistake.
**Risks:**
- **RISK-002** The fake becomes stricter than Compose for a subcommand Picket starts calling later where `-p` or `-f` means something else (`compose run -p` publishes a port). Mitigation: the fake answers only the calls it lists, so a new subcommand needs a new answer anyway, and the refusal list is limited to the seven subcommands verified above.

### D-003: A refusal carries the engine's cause, not Podman's wrapper line

**Decision:** Infrastructural decision. `failureCause(result)` in `engine.mts` replaces `lastErrorLine` at all its call sites. It strips ANSI escapes, drops blank lines, the line starting `>>>> Executing external compose provider` and the line matching `Error: executing <program> ...: exit status <n>`, then returns the last remaining line, joined after the line before it with one space when that line ends with a colon. With nothing left it returns the last raw line, so a wrapper-only stderr still says something. A one-off script ran this rule on the two stderr captures of 2026-11-14 and returned `unknown flag: --profile` and `Error response from daemon: setting up Pasta: pasta failed with exit code 1: Couldn't open PID file <path>: Permission denied`; plain `not found` stays `not found`.
**Instead of:** the whole stderr in the refusal: the cause is kept, but Compose's progress lines and the wrapper's full argv bury it, and every renderer prints the refusal as one line.
**Risks:**
- **RISK-003** A later Podman changes the banner or wrapper text, and the wrapper line comes back as the cause. Mitigation: the captured stderr files pin today's text in tests, and the fallback is today's behaviour, no worse.
- **RISK-004** A cause spread over three or more lines keeps only its last two. Mitigation: accepted; both captured faults fit in two.

### D-004: A host networking fault stays outside Picket

**Decision:** Infrastructural decision. Picket does not work around the pasta denial: no `network_mode` in the override document, no switch to slirp4netns, no runroot probe in `env check`. The machine owner fixes the host (OQ-001); Picket's part is that the refusal names the cause (D-003), so a user who meets it sees `Couldn't open PID file ...: Permission denied` instead of `exit status 1`.
**Instead of:** a networking probe in `env check` that runs one container on a user-defined network and reports the pasta failure early: it gives a clearer first-run error, but it starts containers inside a read-only check and is a new feature outside this request.
**Risks:**
- **RISK-005** Other users with a moved Podman runroot meet the same failure at `env trial`. Mitigation: the cause text reaches them; a check finding can be requested as its own item.

### D-005: Every further real-engine fault becomes a fake refusal before its fix

**Decision:** Infrastructural decision. Phase 3 runs the real-engine tests after OQ-001 and fixes each fault in the module that owns the failing call (`trial.mts`, `start.mts`, `stop.mts`, `purge.mts` or `engine.mts`). Before each fix, the fake engine learns the real engine's answer to that input (a refusal, or the real output shape), and a test drives the input through the fake and fails; the fix makes it pass. Faults the probe could not reach, because `up` failed first: `up --detach --wait` with healthchecks on rootless Podman, the output of `compose port`, and `ps --filter status=running`.
**Instead of:** fixing against the real engine alone and leaving the fake as it is: faster for this item, but the next regression passes the fake-engine suite again, which is how this item's first fault shipped.
**Risks:**
- **RISK-006** A fault depends on timing (a healthcheck that is slow on one run), so the fake cannot model it. Mitigation: such a fault is named in the phase block with the real stderr and fixed without a fake answer; the criterion T-3.4 lists it as an exception.

## Scope

**In:**
- The Compose argument order in `engine.mts` and every call that passes a global flag.
- The fake engine refusing a global flag after the subcommand, with Compose's own text.
- Refusal text that keeps the engine's cause at every former `lastErrorLine` call site.
- Further faults that `check`, `trial`, `start`, `stop` and `purge` show on Podman 5.7.0 with Compose 2.40.3, once the host fault (OQ-001) is fixed.

**Out:**
- The shared-stack purge finding of the cumulative review.
- The Se4 class follow-up.
- Saved scenarios (TF-003).
- Docker and native Windows runs; on this machine `docker info` exits 1 (permission denied on the socket), so `findEngine` picks Podman.
- Fixing the host's Podman or AppArmor configuration (OQ-001), and a networking probe in `env check` (D-004).

## Phase 1: Global flags before the subcommand

**Touch set:**
- `src/lib/shared/env/engine.mts`: `composeOutput` and `readModelJson` argument order
- `src/lib/shared/env/engine.test.mts`: T-2.3 test expects new argv
- `test/fixtures/env/fake-engine.mjs`: parse global flags like Compose
- `test/env/fake-engine.test.mjs`: new, spawns the fake per flag
- `test/cli/env.test.mjs`: read only, must pass unedited
- `src/lib/verbs/env/start.test.mts`: read only, order-free `--profile` match
- `test/env/model.engine.mjs`: read only, real-engine model test

**Changes:**
- `engine.mts`: `composeOutput(engine, root, globalFlags: string[], args: string[])` builds `["compose", ...composeFiles(root), ...globalFlags, ...args]`. `readModelJson` calls it with `[]` for `config --profiles` and with the `--profile <name>` pairs for `config --format json`. The refusal text names the subcommand arguments only: `compose config --format json failed: <cause>`. `composeArgs`, `runCompose` and their callers keep their shape.
- `engine.test.mts`: the T-2.3 test's recorded calls and expected argv move `--profile picket-data` before `config`.
- `fake-engine.mjs`: `parsed(args)` returns `{ files, projectDirectory, profiles, words, misplaced }`. For a call starting with `compose`, it reads value flags (`-p`, `-f`, `--project-directory`, `--profile`) up to the subcommand; any of those four after the subcommand is the first `misplaced` flag. A misplaced flag exits 1 before any answer, with `unknown flag: <flag>` for a long flag and `unknown shorthand flag: '<letter>' in <flag>` for a short one. The model answer matches `compose config --format json` with `profiles` holding `picket-data`; `compose config --format json` without the profile has no answer. Non-compose calls (`info`, `image`, `ps`, `volume`, `network`) parse as today.
- `test/env/fake-engine.test.mjs`: spawns the fake with `process.execPath` and the four misplaced flags after `config`, and the correct order, asserting status, stdout and stderr.

**Done when:**
- **T-1.1** The T-2.3 test in `src/lib/shared/env/engine.test.mts` asserts that the second call of `readModelJson` is exactly `compose --project-directory <root>/.picket/env -f <root>/.picket/env/compose.yaml --profile picket-data config --format json`, and passes.
- **T-1.2** `test/env/fake-engine.test.mjs` shows the fake exiting 1 with empty stdout and stderr `unknown flag: --profile`, `unknown flag: --project-directory`, `unknown shorthand flag: 'p' in -p` and `unknown shorthand flag: 'f' in -f` for each flag placed after `config`, and exiting 0 with the recorded model when `--profile picket-data` precedes `config`.
- **T-1.3** `node test/fixtures/env/fake-engine.mjs compose --project-directory test/fixtures/env/umbrella/.picket/env -f test/fixtures/env/umbrella/.picket/env/compose.yaml config --format json --profile picket-data` exits 1 and prints `unknown flag: --profile`.
- **T-1.4** After `npm run build`, `node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella` with `PICKET_ENGINE` unset exits 0 on this machine and prints `engine: podman (Linux containers, Compose 2.40.3+ds1-0ubuntu1)` and `rules passed`. Before-image, captured on base 36e08781: exit 2 and `refused: compose config --format json --profile picket-data failed: Error: executing /usr/libexec/docker/cli-plugins/docker-compose ...: exit status 1`.
- **T-1.5** After `npm run build`, `node --test test/env/model.engine.mjs` exits 0 with one passing test (T-2.7, live model equals the recorded one).
- **T-1.6** `test/cli/env.test.mjs` passes with no edit: `git diff --exit-code 36e08781 -- test/cli/env.test.mjs` exits 0, so the fake still answers every call the verbs make.

## Phase 2: Refusals keep the engine's cause

**Touch set:**
- `src/lib/shared/env/engine.mts`: `failureCause` replaces `lastErrorLine`
- `src/lib/shared/env/engine.test.mts`: cause tests, renamed refusal test
- `src/lib/shared/env/trial.mts`: build and up failure text
- `src/lib/shared/env/purge.mts`: ids, down, image rm text
- `src/lib/verbs/env/start.mts`: `composeOrRefuse` refusal text
- `src/lib/verbs/env/stop.mts`: compose stop refusal text
- `src/lib/verbs/env/status.mts`: ps refusal text
- `test/fixtures/env/fake-engine.mjs`: wrap compose failures like Podman
- `test/fixtures/env/podman-stderr/config-unknown-flag.txt`: new, captured stderr
- `test/fixtures/env/podman-stderr/up-pasta.txt`: new, captured stderr

**Changes:**
- `engine.mts`: `export function failureCause(result: ProgramResult): string` by the rule of D-003; `lastErrorLine` is removed. The banner and wrapper patterns are module constants.
- The six call sites (`engine.mts` `composeOutput`, `trial.mts` `round`, `purge.mts` `ids` and `removeAll`, `start.mts` `composeOrRefuse`, `stop.mts`, `status.mts`) call `failureCause`; each message keeps its present prefix (`compose stop failed: `, `up failed: `).
- `fake-engine.mjs`: every failed `compose` call (a misplaced flag, a missing file, no answer) writes to stderr the Podman provider banner, then its cause line, then `Error: executing /usr/libexec/docker/cli-plugins/docker-compose <the args after compose>: exit status 1`, the shape Podman 5.7.0 writes. Non-compose failures keep one line.
- The two fixture files hold the stderr Podman 5.7.0 wrote on 2026-11-14, byte for byte except that absolute machine paths become `/umbrella/...`, the way `compose-config.json` records them. `config-unknown-flag.txt` is the stderr of `podman compose --project-directory /umbrella/.picket/env -f /umbrella/.picket/env/compose.yaml config --format json --profile picket-data`; recapture it with the T-1.3 paths if the bytes differ. `up-pasta.txt` cannot be recaptured once OQ-001 is fixed, so write it from this capture, where `ESC` is byte 0x1b and the blank second line is kept:

```
ESC[4m>>>> Executing external compose provider "/usr/libexec/docker/cli-plugins/docker-compose". Please see podman-compose(1) for how to disable this message. <<<<

ESC[0m Network picket-probe-mini_default  Creating
 Network picket-probe-mini_default  Created
 Container picket-probe-mini-one-1  Creating
 Container picket-probe-mini-one-1  Created
 Container picket-probe-mini-one-1  Starting
Error response from daemon: setting up Pasta: pasta failed with exit code 1:
Couldn't open PID file /umbrella/podman/run/networks/rootless-netns/rootless-netns-conn.pid: Permission denied
Error: executing /usr/libexec/docker/cli-plugins/docker-compose -p picket-probe-mini --project-directory /umbrella/mini -f /umbrella/mini/compose.yaml up --detach --wait: exit status 1
```

**Done when:**
- **T-2.1** `failureCause` on the bytes of `config-unknown-flag.txt` with status 1 returns exactly `unknown flag: --profile`.
- **T-2.2** `failureCause` on the bytes of `up-pasta.txt` with status 1 returns exactly `Error response from daemon: setting up Pasta: pasta failed with exit code 1: Couldn't open PID file /umbrella/podman/run/networks/rootless-netns/rootless-netns-conn.pid: Permission denied`.
- **T-2.3** `failureCause` returns `not found` for stderr `not found\n`, the wrapper line itself for a stderr holding only that line, and an empty string for empty stderr; one test per input.
- **T-2.4** `readModelJson` with an engine whose runner spawns the fake engine, on a temporary root that has no `.picket/env/compose.yaml`, throws `Refused` with the message `compose config --profiles failed: fake engine: open <root>/.picket/env/compose.yaml: no such file or directory`, so the cause survives the fake's Podman-shaped wrapper.
- **T-2.5** `node test/fixtures/env/fake-engine.mjs compose --project-directory test/fixtures/env/umbrella/.picket/env -f test/fixtures/env/umbrella/.picket/env/compose.yaml config --format json --profile picket-data` exits 1 and prints `unknown flag: --profile` followed by `Error: executing /usr/libexec/docker/cli-plugins/docker-compose`.
- **T-2.6** No file under `src/` names `lastErrorLine`, and the six call sites listed above call `failureCause`.
- **T-2.7** `test/env/fake-engine.test.mjs` and `test/cli/env.test.mjs` pass, the latter still unedited since 36e08781.

## Phase 3: The lifecycle passes on Podman

Starts only after OQ-001 is answered and `podman network create picket-probe-net && podman run --rm --network picket-probe-net docker.io/library/busybox:1.36 true` exits 0 on this machine (it exits 126 with the pasta cause on 2026-11-14).

**Touch set:**
- `test/env/lifecycle.engine.mjs`: read only, the lifecycle spec
- `test/env/model.engine.mjs`: read only, the model spec
- `scripts/test.mjs`: read only, runs the env step
- `test/fixtures/env/fake-engine.mjs`: learn each real answer first
- `test/env/fake-engine.test.mjs`: one test per learned answer
- `src/lib/shared/env/trial.mts`: [INFERRED] trial up and down
- `src/lib/verbs/env/start.mts`: [INFERRED] up, port, image inspect
- `src/lib/verbs/env/stop.mts`: [INFERRED] compose stop
- `src/lib/shared/env/purge.mts`: [INFERRED] listing and removal
- `src/lib/shared/env/engine.mts`: [INFERRED] adapter calls

**Changes:**
- Run `node scripts/test.mjs build env` and read the first failure. For each fault, by D-005: teach the fake the real engine's answer for that input, add the failing test, then fix the module that owns the call. Candidates the probe could not reach: `up --detach --wait` with healthchecks on rootless Podman, the `compose port` output read by `hostUrl` in `start.mts`, and the `ps -q --filter status=running` listing the test reads.
- Repeat until the env step passes. The two engine test files are the specification and stay unedited; a fault in a test itself goes to the lead as a record amendment, not an edit.
- The block lists each fault: the call, the real stderr cause, the fix, and the fake test that pins it.

**Done when:**
- **T-3.1** `node scripts/test.mjs build env` exits 0 on this machine, with `PICKET_ENGINE` unset, Podman 5.7.0 and Compose 2.40.3, and prints `env: exit 0`.
- **T-3.2** `git diff --exit-code 36e08781 -- test/env/lifecycle.engine.mjs test/env/model.engine.mjs` exits 0: both real-engine tests pass as written.
- **T-3.3** After that run, Podman lists no container, volume or network labelled `com.docker.compose.project=picket-trial` and no image labelled `io.github.picketai.item=trial`.
- **T-3.4** Every fault the block lists has an answer or a refusal in `test/fixtures/env/fake-engine.mjs` and a test in `test/env/fake-engine.test.mjs` that drives that input through the fake; a timing fault the fake cannot model is named as such with its real stderr (RISK-006).
- **T-3.5** `node dist/bin/picket.mjs env check --root test/fixtures/env/umbrella` still exits 0 on Podman with `rules passed`, and `test/cli/env.test.mjs` passes unedited since 36e08781.

## Open questions

- **OQ-001** Will the machine owner fix the host so that a rootless Podman container can join a user-defined network? Today `podman info` gives runroot `/mnt/work/development/containers/podman/run` (from `~/.config/containers/storage.conf`, `/home/vlad/Work` resolving to `/mnt/work`), and the pasta AppArmor profile allows writes only under `/run/user/<uid>/**`, `/tmp/**` and the owner's home, so pasta cannot write its PID file. Recommended: set `runroot` back under `/run/user/1000` (Podman's rootless default `/run/user/1000/containers`), with containers stopped, then `systemctl --user restart podman.socket`; the alternative is a line `owner /mnt/work/development/containers/podman/run/** rw,` in `/etc/apparmor.d/local/usr.bin.pasta` and `sudo apparmor_parser -r /etc/apparmor.d/usr.bin.pasta`. Owner: the user. Fallback: phases 1 and 2 ship; their `tests` must_have runs `npm test`, whose env step stops in `test/env/lifecycle.engine.mjs` at `compose up` with the pasta cause (later steps do not run), and the user reads that at the gate as this host fault or lets verify run with `PICKET_ENGINE=test/fixtures/env/fake-engine.mjs`, which skips the env step; phase 3 waits.

## Revision log
