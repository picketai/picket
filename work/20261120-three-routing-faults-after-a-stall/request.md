Fix three routing faults seen on the work item 20261119-database-guards-and-confirmed-sql-runs:
1. A developer's PHASE STALLED was not recorded. On 2026-11-19 at 19:00 the second developer instance of the item (lpon-developer-2, spawned after a "continue with a fresh developer" reply) ended its turn with PHASE STALLED and the block saved in phases/2.block.md, but verdicts.jsonl got no row and picket next kept answering implement_phase. The lead recorded it with picket route by hand. The numbered instance name is the first suspect.
2. After a "redesign" reply at a resolve_block gate, picket reply printed the amend send to the architect, while picket next already answered implement_phase for the developer, as if no amendment were pending. The two must agree until the architect answers AMENDED.
3. A PHASE DONE after a recorded PHASE STALLED left the item blocked. On 2026-11-20 at 06:59 the developer stalled on phase 2, then at 07:05 finished it; route recorded PHASE DONE, the approval and the commit under the run grant, but status stayed blocked and picket next kept answering resolve_block with a stale packet.

## Brief
purpose: Make the kernel's state follow what agents and the user did around a stalled phase, so the lead never routes a verdict by hand and never prints a stale gate.
in scope: The verdict routing hook and picket route, reply and next for: a stall from a numbered developer instance, a redesign reply at a resolve_block gate, and a PHASE DONE that follows a recorded stall; unit tests that replay the three sequences from the item's verdicts.jsonl and replies.jsonl
out of scope: New verdict tokens or gate options; the session.append mod hook; any change to the design lane's steps; the data guards themselves
