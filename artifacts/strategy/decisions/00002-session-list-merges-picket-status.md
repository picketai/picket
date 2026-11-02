---
kind: sdr
title: "Session list merges into picket-status"
date: "2026-11-02"
audience: stakeholder
sources:
  - "https://claude.ai/artifact/JriMuvHWEkjXaiCQyZLiBe (canvas, Work pane page)"
  - "https://claude.ai/artifact/78MVaNYN5PLKLWw2VUR7tx (PicketAI design system)"
  - "work/20261010-ship-picket-session-mod-with-picket-init/order.md"
  - "work/20261011-init-stops-installing-picket-session"
confidence: high
---

# SDR-00002: Session list merges into picket-status

**Status:** Ratified
**Affected contexts:** Picket mods (no charter yet)

## Context

A developer working with Picket runs up to ten work items a day, one Claude Code session each, and after a day or two has 30 to 40 sessions that Claude Code's `/resume` list does not help to sort. The picket-session mod tried to fix this by opening and resuming sessions from a sidebar, but resuming a session that is live elsewhere forks its transcript, and steering terminal tabs or windows does not work across operating systems. On its own, rename, archive and delete do not justify a separate mod, and its agents view repeats what the picket-status band already shows.

## Decision

The session list becomes a pane of picket-status, and the picket-session plugin retires. The pane tracks sessions, not work items: it groups this project's sessions by what the work items routed in them need, shows read-only detail, and helps clean up after a work item closes. It never opens, resumes or creates a session; its only way into one is copying `claude --resume <id>`. This keeps the value (finding the session that needs you among dozens) inside a mod most people already have, with one data path and no terminal control.

### D-001 Sessions are the unit

Each row is a session of the project root's session folder, carrying every work item routed in it, read from the `session` field of each item's `verdicts.jsonl`. An item continued in a later session shows greyed in the earlier one, and its live state counts only in its latest session. Session names gain the item keys as a prefix, `[PIC-123][PIC-124]`, in a later change.

### D-002 Closed is not done

After `picket close` the developer still opens a pull request, waits for the merge and removes the worktree. A closed item stays visible under CLOSED with its branch and whether its worktree is still on disk; only the developer marks a session done. The Done list is kept per machine.

### D-003 The band is the entry point and stays cheap

The agents line of the band always ends with `☰ <sessions>` (opens the work pane) and `M↓` (opens the Markdown pane, hidden when picket-markdown is not installed), plain text in every font, preceded by `◀ <n> need you` in warning only while items in other sessions wait. The band counts session files with one folder listing and asks the kernel again only when a work item's state or verdict file has changed; transcript titles are read only while the pane is open.

### D-004 Commands are named after their plugin and run mid-turn

The work pane opens with `/picket-session`; the Markdown pane's `/md` becomes `/picket-markdown`, with no alias. Both register as immediate commands, so the band buttons work while a model turn runs.

### D-005 The kernel decides what needs you

Whether a work item needs the developer, is working, is open or is closed is one kernel function behind `picket list`, whose JSON rows carry it with the session, branch and status, typed in the shared views module. The band count and the pane read the same answer.

## Subdomain and investment implications

**Subdomain affected:** Developer experience mods, Supporting
**Investment shift:** effort moves into picket-status (a pane, two band buttons) and one kernel classification; it leaves picket-session (session switching, terminal control, agent cards and sprites), which stops being maintained.

## Consequences

**Gains:**
- One installed mod answers "which of my sessions needs me" without leaving the current session.
- One data path for the band and the pane, decided by the kernel, so they cannot disagree.
- Nothing depends on a terminal or an operating system; copy and paste works everywhere.

**Costs:**
- picket-status grows from a band to a band and a pane.
- The agent cards and crew sprites leave the product; the band's agents line is the only agent view.
- `/md` users retype the longer `/picket-markdown`.

**Risks:**
- **RISK-001** [major] Deleting a transcript moves from an opt-in mod into a default-installed one. Mitigation: delete stays behind its confirmation, never on a hotkey, and only on the Done tab and in Cleanup.
- **RISK-002** [minor] The always-drawn band adds work to every session. Mitigation: D-003's rules, with transcript reading only while the pane is open.
- **RISK-003** [minor] The hooks API is early access and was once turned off remotely on a development machine. Mitigation: the kernel's `picket list` keeps working without the mods.

## Context-map impact

No change to the context map.

## Alternatives considered

### Alternative: Keep picket-session, switching sessions in the current window, a new tab or a named window
Ruled out because resuming a live session forks its transcript and tab or window control is not cross-platform.

### Alternative: Keep a separate mod with the work index
Ruled out because it duplicates the band's data path and install for a view the band can open.

### Alternative: A session finder that searches transcripts
Ruled out because it repeats what `/resume` already searches and reads large files on every refresh.

### Alternative: Retire the pane and add a CLI verb with a band counter
Ruled out because a list in the terminal brings back the 40-row problem the change exists to solve.

## Tactical follow-up

- **TF-001** [TACTICAL DESIGN NEEDED] The work pane in picket-status: groups, Peek, Cleanup, Done tab, copy and rename, from the canvas Work pane page.
- **TF-002** [TACTICAL DESIGN NEEDED] Band buttons `☰ <n>` and `M↓` with the `◀ <n> need you` count and the cheap refresh rules of D-003.
- **TF-003** [TACTICAL DESIGN NEEDED] The kernel classification and `picket list` JSON fields of D-005, read from `verdicts.jsonl` for D-001.
- **TF-004** [TACTICAL DESIGN NEEDED] Rename `/md` to `/picket-markdown`, make both commands immediate, and open the Markdown pane empty when there is nothing to reopen.
- **TF-005** [TACTICAL DESIGN NEEDED] Retire picket-session: one release with a stub that tells its users to uninstall it, a CHANGELOG line, then removal from the marketplace and the mods list.
- **TF-006** [TACTICAL DESIGN NEEDED] Later change: prefix session names with their work item keys after testing a rename of a live session.
