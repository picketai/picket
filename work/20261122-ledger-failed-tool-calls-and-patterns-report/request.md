Add two things to Picket, from artifacts/reports/lessons-three-unread-assets-transcripts.md (R-031, R-032, R-014).

1. Record failed tool calls per turn in the ledger. The ledger turn row holds tool_calls, reads and rereads but no count of failed tool calls and no tool names, though toolStats already collects counts and names. Add the failed tool call count, and the tool names behind it, to the turn row so a run that quietly works around a stale instruction is visible.

2. Add a read-only report that aggregates what the ledger and the gates already hold across work items: blocks, bounces and guard denials grouped by hook and reason, the user's rejection reasons from the x replies in replies.jsonl, and the failed tool calls of item 1 grouped by agent and tool. It changes no state and names the recurring patterns, as repeatedClasses does for review classes at close.

## Brief
purpose: Make silent waste visible: record failed tool calls per turn, and read back the denials, rejection reasons and failures the ledger and gates already hold
in scope: failed tool call count and tool names on the ledger turn row; a read-only report across work items grouping blocks, bounces and guard denials by hook and reason, the user's x replies from replies.jsonl, and failed tool calls by agent and tool
out of scope: any automatic edit to skills, agents or rules; LLM scoring; a score trend over time; bench tasks from work items; changes to guards or routing
