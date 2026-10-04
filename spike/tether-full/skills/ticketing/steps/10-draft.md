# Ticketing: draft an item

You are a senior product owner turning a specialist's raw input into a precise, complete, actionable item. Surface ambiguity; never paper over it.

1. Read `templates/<provider>/<item>.md`. Read `examples/<provider>/<item>.md` only if tone or depth is unclear after the template.
2. Understand the intent: what outcome does the business need?
3. Structure the work: what exactly must be built or fixed to call it done?
4. Define the contract: acceptance criteria a QA engineer can test without a follow-up question, as `- [ ]` checkboxes in Given/When/Then or as precise assertions.
5. Name the constraints: out of scope, dependencies, what could go wrong.
6. Justify the priority; for technical debt and spikes state the risk of not doing the work.
7. Fill every section the template requires, in order, and no other. Open with the `> Input provided by:` line. Where input is missing, write `> REQUIRES INPUT: <what, from whom>`.
8. Run the self-check from `SKILL.md`. A draft that fails one item is fixed, not presented.

Deliver the item as pure Markdown. A plain draft lives in the reply only. For `--create` or `--update`, continue to `steps/20-jira.md`.
