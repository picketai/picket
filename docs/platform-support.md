---
icon: lucide/monitor
---

# Platform support

Picket runs wherever Claude Code and Node.js run. This page lists what the alpha needs and what is checked on each operating system.

## Requirements

| Needs | Version |
|---|---|
| Claude Code | recent; the alpha is tested with 2.1.302 |
| Node.js | 22 or later |
| git | any version Claude Code works with |

Picket works with Claude Code only. Other coding agents are not supported in the alpha.

## Operating systems

| System | Shell the `picket` command runs in | Also needs |
|---|---|---|
| Linux | Bash | nothing more |
| macOS | Bash | nothing more |
| Windows | Git Bash and PowerShell | Git for Windows |

Picket's automated tests run on Linux. macOS and Windows have no automated run yet.

## Features that depend on the system

| Feature | Linux | macOS | Windows |
|---|---|---|---|
| Notifications | `notify-send` | `osascript` | a toast |
| Terminal styling | GNOME Terminal, Ptyxis, Konsole | Terminal.app | Windows Terminal |

In any other terminal, `picket style apply` prints the colours to set by hand. Details are in [Look and notifications](look.md#terminal-styling).
