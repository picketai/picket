---
name: hook-continued-phase-not-routed
description: under a run grant, a phase begun from the SubagentStop hook's context (not a lead message) is not routed on its first PHASE DONE
metadata:
  type: project
---

On 2026-10-29 (item 20261029-documenting-and-consulting-skills-picket-name), phases 3, 4 and 5 began from the route.verdict hook's "Next: implement_phase" context, inside the same subagent run. Their first PHASE DONE was not routed, and each routed only when the lead asked for a re-emit. Phases begun from a lead message routed at once. The likely cause [INFERRED] is that the next stop carries `stop_hook_active: true` and routeVerdict returns null for it. The lead planned a kernel fix.

**Why:** the lead spent a round trip per phase on re-emits.

**How to apply:** when a phase starts from hook context, say on Decisions: that its first emit may not route. Check whether the kernel fix landed before relying on this.
