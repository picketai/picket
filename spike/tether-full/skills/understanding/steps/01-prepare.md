# Step 1: prepare

Read `.claude/MEMORY.md` if it exists. If it does not, note that and do not create it; step 3 creates it on the first resolved term or decision.

Skim the codebase for prior art. Grep for the key nouns in the user's plan and note the terminology the plan touches: existing type names, module names, and glossary entries that overlap or conflict. This is the material the interview challenges against.

Build a working list of the design tree's branches from the plan: each concept, relationship, or claim that has to hold for the plan to work. The interview walks this list depth-first.

Next: `steps/02-interview.md`.
