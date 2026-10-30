# Consulting: interview

Walk the design tree of the user's plan one branch at a time. Empty input: ask "What should we work through? Provide the plan, design, or idea you want stress-tested." and stop.

1. Read `.claude/MEMORY.md` if it exists. If it does not, note that and do not create it; `steps/capture.md` creates it on the first resolved term or decision.
2. Skim the codebase for prior art. Grep for the key nouns in the user's plan and note the terminology the plan touches: existing type names, module names, and glossary entries that overlap or conflict. This is the material the interview challenges against.
3. Build a working list of the design tree's branches from the plan: each concept, relationship, or claim that has to hold for the plan to work.
4. Walk the list depth-first, resolving dependencies one by one. Ask one question, give your recommended answer with it, and wait for the reply before asking the next.
5. Capture each resolved term or decision at once, as `steps/capture.md` says. Do not batch.

## Protocol

Prefer code exploration over questions. If Grep, Glob, or Read can answer it, explore instead. Ask the user only what the code and `.claude/MEMORY.md` cannot tell you.

Challenge against existing language. When the user's term conflicts with a glossary entry, surface it immediately. Example: "MEMORY.md defines 'cancellation' as the customer-initiated path only, but you seem to mean any termination. Which is it?"

Sharpen fuzzy language. When a term is vague or overloaded, propose a precise canonical name. Example: "You say 'account'. Customer or User? Those are different things."

Stress-test with concrete scenarios. When a relationship between concepts is under discussion, invent a specific scenario that probes the edge and forces precision about the boundary.

Cross-reference with code. When the user states how something works, check that the code agrees. On contradiction, surface it: "The code cancels entire Orders, but you said partial cancellation is possible. Which is right?"

## Termination

Count only questions actually asked of the user, not your own Grep or Read lookups. Stop at the first condition that fires and emit the closing summary from `steps/capture.md`.

1. User stop signal: the user replies `done`, `stop`, `that's enough`, `enough`, `wrap up`, or `summarise` (case-insensitive, on its own line or as the whole turn).
2. Question cap: 12 questions asked and none of the last 3 resolved a new term or decision. Offer to continue and stop pending an explicit `continue`.
3. Hard cap: 20 questions asked. Stop unconditionally and recommend ratifying, or breaking the topic into a fresh session.
4. Design tree exhausted: no open branches remain in the working list and the last reply surfaced no new ones.
