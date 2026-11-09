Change two parts of picket close's output, per the user's decisions on research findings R-016 and R-017:
1. Report repeated mistake classes at every close: each close lists every class from this item's reviews that appears in two or more reviews across work items, read from the verdict logs only, so the output no longer depends on which item closed first and close stops reading the ledger to find earlier reports (newRepeats in src/lib/verbs/close/close.mts).
2. Drop the wall part from the audit line (wallPart in src/lib/verbs/close/audit.mts) and from the documented closing block formats in the lane skills.

## Brief
purpose: Apply the user's decisions on R-016 and R-017: repeat reporting at close no longer depends on close order, and the audit line drops wall time
in scope: src/lib/verbs/close/close.mts and audit.mts with their tests; the closing block formats in the designing, ordering and researching SKILL.md files
out of scope: Other audit parts (tokens, bounces, blocks); old repeat rows already in ledgers; the ledger schema
