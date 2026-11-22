---
icon: lucide/life-buoy
---

# Troubleshooting

Find the heading that matches what you see. Each entry says why it happens, when that is known, and what to do.

## Setup

### A Picket command is unknown

Claude Code does not know `/picket:inspecting` or another Picket command.

**Why.** The plugin is not enabled for this project.

**What to do.** Run `/plugin` (or `claude plugin list`) and look for `picket@picketai`. If it is missing, run init again in the project root and restart Claude Code:

``` sh
npx @picketai/picket@alpha init
```

### The `picket` command is not found { data-toc-label="The picket command is not found" }

``` text
picket: command not found
```

**Why.** The command comes with the plugin, on the `PATH` of Claude Code's Bash and PowerShell tools only. A plugin installed during a session reaches the tools only after a restart.

**What to do.** Check with `/plugin` that `picket@picketai` is enabled for the project, then restart the session. In your own terminal there is no `picket`: run a verb as `npx @picketai/picket@alpha <verb>`.

### A different version runs

**Why.** A global copy from an earlier install comes first on your `PATH`, so a session runs that old version instead of the plugin's. `init` warns about it.

**What to do.** Remove the global copy and restart Claude Code:

``` sh
npm uninstall -g @picketai/picket
```

### Many permission prompts

**What to do.** Check that `.claude/settings.json` holds `Bash(picket *)`, and run `npx @picketai/picket@alpha init` again if it does not. Commands that run your code (`picket drive`, `picket check`) still ask under PowerShell on purpose.

## During the work

### The wrong lane

**Why.** The kernel picks the lane from your words and from the files the change touches.

**What to do.** Say which lane you want in the request: add a line such as `lane: fast`, and the kernel honours it. [Choosing the lane yourself](lanes/index.md#choosing-the-lane-yourself) has an example.

### A work item is stuck

**What to do.** Ask for the next step, then pick the item up from there:

``` text
picket next <id> --human
/picket:resuming <id>
```

The first prints the next step and who owns it. The second continues the item.

## A hook denied a tool call

A denial is a guard working, and its message says which guard and why. Find the start of your message below.

### A destructive command

``` text
guard.bash: command contains a destructive sub-command
```

**Why.** A Bash or PowerShell command deletes, resets, force-pushes or similar.

**What to do.** In the default, acceptEdits and auto modes the agent reruns it as `PICKET_ESCALATE="<why>" <command>` and you decide in the dialog. Cleanup after the work is recorded with `picket leave` and listed when the item closes. Or run it yourself: type `! <command>` in Claude Code.

### A new comment

``` text
guard.comments: ... adds 1 comment line(s)
```

**Why.** A new comment without your approval.

**What to do.** Approve it with `k <n>` at the next packet, or let the code speak.

### A shell command that writes code

``` text
guard.bash: ... is code; a shell write skips guard.comments and guard.silenced
```

**Why.** A shell edit in place (`sed -i`, `perl -i`, an inline script) of a code or test file, from anyone; or an agent's redirect, `tee` or PowerShell `Set-Content` writing one.

**What to do.** Nothing. The file is written with the Edit or Write tool, where the comment and silenced-check guards run. A code generator you asked an agent for can run as `PICKET_ESCALATE="<why>" <command>`.

### A silenced check

``` text
guard.silenced: ... adds 1 silenced check(s)
```

**Why.** A new suppression, skipped or focused test, or weaker threshold without your waiver.

**What to do.** Let the agent fix the cause, or accept it with `w <n>` at the next packet.

### An edit of a work item's state

``` text
guard.scope: ... is kernel-owned
```

**Why.** A direct edit of a work item's state.

**What to do.** Nothing. State changes only through `picket`.

### A file that changed since it was read

``` text
guard.scope: read ... before editing it
```

**Why.** The file changed since the agent last read it.

**What to do.** Nothing. The agent re-reads and retries.
