---
kind: order
lane: order
title: Bench stops servers its runs started
date: 2026-10-09
audience: developer
sources: request.md; lead context (gate-13 leftovers on port 53860, the agreed rule); bench/lib/ports.mjs; bench/run.mjs:150 to 232; bench/lib/claude.mjs; Win32_Process property list and a job-object probe run on this machine (D-001)
phases:
  - n: 1
    files:
      - bench/lib/ports.mjs
      - bench/test/ports.test.mjs
    greps:
      - path: bench/lib/ports.mjs
        pattern: export function runOrphans
    tests: true
    drive: false
  - n: 2
    files:
      - bench/lib/jobwrap.ps1
      - bench/lib/claude.mjs
      - bench/run.mjs
      - bench/test/ports.test.mjs
    greps:
      - path: bench/lib/claude.mjs
        pattern: jobwrap\.ps1
      - path: bench/run.mjs
        pattern: runOrphans
    tests: true
    drive: true
---
# Order: Bench stops servers its runs started

## Problem

The bench's sweep (`killListeners(port)`, `bench/run.mjs:230`) stops only what listens on the run's assigned port, so a server a task starts on another port survives and the record still says `orphans: 0`. In gate-13, `npm start` and `ts-node src/main.ts` stayed on port 53860 and held the run folder open. The agreed rule was "stop the listeners started during the run whose working folder is inside the run's repo", but Windows does not expose another process's working folder. On this machine `Win32_Process` has no such property (its full property list, read with `Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Get-Member -MemberType Property`, runs from `Caption` to `WriteTransferCount` with `CommandLine`, `CreationDate`, `ExecutablePath` and `ParentProcessId`, and nothing for the current directory). The gate-13 leftovers also had relative command lines and a dead parent, so neither the command line nor the parent chain ties them to the run.

## Decisions

### D-001 (r2): on Windows, "started by the run" means "in the run's job object"; the rule changes
**Decision:** On Windows, each `claude` call is started through a small PowerShell wrapper that creates a Windows job object, puts itself in it, and starts `claude`; every process `claude` starts, and every process those start, joins the job and stays in it after its parent dies. When `claude` exits, the wrapper writes every live job member as `{ pid, created }` to the run's job file. At the end of the run, the sweep stops every recorded member that is still alive, listening or not (same pid and same creation time, so a reused pid is never hit), plus the live descendants of recorded members created after the run started; an `npm start` parent goes with its `ts-node` child. This changes the agreed rule from "listening, with a working folder inside the repo" to "started by the run's process tree", and the user accepted both the new rule and the widening (OQ-001). It never touches a process the user started, even one running in the repo folder. It does stop a run-started server whose working folder is elsewhere. Probe evidence, run on this machine with pwsh 7.6.6 and Git Bash: a C# `Add-Type` class over `CreateJobObject`, `AssignProcessToJobObject` and `QueryInformationJobObject` (class 3, the process id list) put `bash.exe -lc "cd '<dir>' && sleep 2 && (node server.js > /dev/null 2>&1 &) ; exit 0"` in a job. The output was `bash pid 27032 assigned=True`, `bash exited code 0`, `server port 57895 listener pid 39184`, `CommandLine : "C:\Program Files\nodejs\node.exe" server.js`, `job pids: 31924,39184`, `listener in job: True`. So a backgrounded listener with a relative command line was in the job after its shell exited. The probe files were `jobprobe/probe.ps1` and `jobprobe/server.js` in the session scratchpad, and both helper processes were gone afterwards. On POSIX, where the working folder is readable, the agreed rule stays: a listener whose working folder (`lsof -a -p <pid> -d cwd -Fn`) is inside the repo and whose start time is after the run's start. The widening is not free on POSIX. Without a job, "started by the run" can only be read as "working folder in the repo, started after the run began", and for non-listening processes that also matches a user's shell or editor opened in the run folder to look at a live run. So POSIX stays listeners only.
**Instead of:** reading the working folder out of each process's memory (the PEB through `ReadProcessMemory`): it would keep the agreed rule, but reading another process's memory is the behaviour endpoint protection on this machine flags, and it already refuses some `node` command lines (exit 126).
**Risks:**
- **RISK-001** The `claude` binary or the Bash tool's launcher starts children with `CREATE_BREAKAWAY_FROM_JOB`, so they leave the job. Mitigation: the record gains `tracked`, the number of job members seen per run; `tracked: 1` or `0` on a run that ran tools shows the breakaway at once. The assigned-port sweep stays as a second net.
- **RISK-002** A server started after `claude` exits, by a member that is still alive, is missing from the written list. Mitigation: the sweep also stops live descendants (by `ParentProcessId`) of recorded members created after the run started.

### D-002 (r2): one sweep function with injected system calls, counted per stopped process
**Decision:** `bench/lib/ports.mjs` gains `runOrphans({ platform, repo, startedAt, jobFile, port, exec })`. It returns the pids to stop: on win32, every recorded job member still alive, listening or not, plus the live descendants of recorded members created after `startedAt`, plus anything listening on `port`; on POSIX, the D-001 working-folder rule plus `port`. It also returns `tracked`. `exec` runs a command and returns stdout, so tests feed recorded outputs. A second function, `stopProcesses(pids, { platform, exec })`, stops each pid on its own (`taskkill /PID <pid> /F` without `/T`, since descendants are already in the list; `SIGKILL` on POSIX) and returns the pids it stopped. `record.orphans` is that count, and `record.tracked` is added. The Windows process table comes from one `pwsh -NoProfile -Command` call that prints JSON `[{ pid, ppid, created }]` from `Get-CimInstance Win32_Process`, and the listener list comes from `netstat -ano -p tcp` as today.
**Instead of:** `taskkill /T` on each listener and counting the listeners: `/T` stops children the record never counts, and its output is localised, so parsing it for a count breaks on a non-English Windows.

## Scope

**In:** the sweep rule per platform, including on Windows run-started processes that do not listen (an `npm start` parent); the Windows job wrapper around `claude`; `record.orphans` and `record.tracked`; tests with recorded outputs; and a zero-quota drive.
**Out:** non-listening processes on POSIX (D-001: not free there); the timeout path's `child.kill()`, which stops the wrapper, not `claude`; any bench run that spends quota.

## Phase 1: The sweep rule, tested on recorded outputs

**Touch set:**
- `bench/lib/ports.mjs`: `runOrphans`, `stopProcesses`, parsers
- `bench/test/ports.test.mjs`: fixtures for both platforms

**Changes:** Per D-002, add the parsers for the `netstat` listener lines (kept from `listenerPids`), the pwsh process-table JSON, the job file (one JSON object per line), `lsof -nP -iTCP -sTCP:LISTEN -Fpn`, `lsof -a -p <pids> -d cwd -Fn` and `ps -o pid=,ppid=,lstart=`. Then add `runOrphans` and `stopProcesses` on top of them, all with an injected `exec`. Keep `nextPort` and `killListeners` exported until Phase 2 switches `run.mjs`.

**Done when:**
- **T-1.1** Win32 fixture: job members `{39184, created A}` (listening on 53860) and `{31924, created B}` (not listening); a user process 5000 listening on 3000 and not in the job; the run port 8123 with no listener. `runOrphans` returns 39184 and 31924 (both members are alive, listening or not), not 5000, and `tracked: 2`.
- **T-1.2** The same fixture, but pid 39184 now has another creation time (reused): it is not returned.
- **T-1.3** A recorded member's live child created after `startedAt` is returned, whether it listens or not; a child created before `startedAt` is not.
- **T-1.4** POSIX fixture: a listener whose cwd is `<repo>/` and which started after `startedAt` is returned; one whose cwd is `<repo>-other/` (a prefix match without a separator), and one in the repo started before the run, are not.
- **T-1.5** `stopProcesses([1, 2])` with an `exec` that fails for pid 2 returns `[1]`, and on win32 every recorded command is `taskkill /PID <pid> /F` without `/T`.
- **T-1.6** `npm test` passes.

## Phase 2: The job wrapper and the run's record

**Touch set:**
- `bench/lib/jobwrap.ps1`: job, start claude, write members
- `bench/lib/claude.mjs`: spawn through the wrapper on win32
- `bench/run.mjs`: run start, job file, sweep, record
- `bench/test/ports.test.mjs`: wrapper drive helper test

**Changes:** Per D-001, `jobwrap.ps1 -JobFile <path> -- <command> <args...>` defines the job class (as in the probe), assigns its own process, starts the command with `UseShellExecute = $false` and no redirection (so stdin, stdout and stderr pass through), waits, appends `{ "pid", "created" }` per live member except itself to the job file, and exits with the command's exit code. `runClaude` gains `o.jobFile`; on win32 it spawns `pwsh -NoProfile -File bench/lib/jobwrap.ps1 -JobFile <f> -- <resolveClaude()> <args>` instead of the bare binary. `run.mjs` sets `startedAt` and `jobFile` (under the run folder) before the first call, passes `jobFile` on every call, and replaces `killListeners(port)` with `runOrphans` then `stopProcesses`. It sets `record.orphans` and `record.tracked`, and the log line names the stopped pids and ports.

**Done when:**
- **T-2.1** Drive (zero quota): `jobwrap.ps1` runs a stand-in command, `bash -lc "(node server.js > /dev/null 2>&1 &); cat > stdin.txt"`, with a prompt piped in. `stdin.txt` equals the prompt, the job file lists the backgrounded `node`, and the sweep stops it and every other recorded member still alive (such as Git Bash's launcher stub for `node`). `orphans` equals the number of processes stopped, at least 1, and `tracked` is at least 1.
- **T-2.2** In the same drive, a second `node server.js` started outside the wrapper, in the same folder, is still listening after the sweep.
- **T-2.3** The wrapper's exit code equals the stand-in command's (checked with `exit 3`).
- **T-2.4** `node bench/run.mjs --harness plugin --tasks fast-01-pagination --dry` still lists the task and spends nothing; the dry path does not start the wrapper.
- **T-2.5** `npm test` passes.

## Open questions

- **OQ-001** The agreed rule changes on Windows (D-001): "listening and started by the run's process tree" instead of "listening with a working folder inside the repo". Do you accept it, and should the sweep also stop run-started processes that do not listen, such as an `npm start` parent? Owner: user. Answered 2026-10-09: both accepted. Windows uses the job-object rule and also stops non-listening run-started processes; POSIX keeps the agreed listener rule (D-001 r2, D-002 r2).

## Revision log

- 2026-10-09: D-001 (r2): user accepted the job-object rule; Windows sweep stops every live run-started process, listening or not; POSIX stays listeners only, since widening would hit user shells.
- 2026-10-09: D-002 (r2): runOrphans returns all live job members plus late descendants on win32, not only listeners; criteria T-1.1, T-1.3, T-2.1 follow.
