---
name: explaining
description: >
  Explain one scenario as a customer or a QA tester would go through the application, with
  real or relevant data, and show how that data changes from the first step to the last.
  Codebase scenarios come first; a general concept outside the project is explained the same
  way from reliable web sources (official docs, standards, papers). Every value carries a
  confidence marker and its source; a value nobody can find is named as not known instead of
  made up. Runs in the main session and answers in the reply. Use when the user says "explain
  with an example", "walk me through", "show me with real data", "what happens to the data
  when", "explain how X works for a user", "explain the concept of", "what is X, with an
  example", or "explain X simply". A question that needs a report on disk goes to
  `picket:researching`. `/picket:explaining <scenario or concept>`.
user-invocable: true
---

# Explaining

Paths cited here and in this skill's step files, such as `explaining/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Input: `$ARGUMENTS`, the scenario or concept in the user's words. Empty: ask what to explain; stop. Never explain "the thing we just discussed" by guess.

## Rules that hold throughout

Runs in the main session, no spawn, no work item, no file written: an explanation is an answer, not a change, so it never goes through `picket admit`. The answer is in the reply.

Two modes, picked in `steps/10-gather.md`. Codebase mode is the default and the main focus: the scenario runs through this project. Concept mode explains a general idea from reliable web sources with the same worked example. A mixed question takes the concept from the web and walks the code.

One scenario, one actor, one path. A second path the user may care about is offered in one line at the end, not walked.

When grounding needs more than 12 files read (codebase) or 5 pages fetched (concept), stop gathering and offer the research lane in one line: "This needs more than a reply can hold: `picket:researching` keeps a report on disk." Walk only what was already grounded if the user declines.

Every data value and every rule carries one marker, with the meanings `picket:documenting` defines (`documenting/SKILL.md`):

- `[VERIFIED]` read directly from a source. It always cites one: `path:line`, a snapshot path, a ticket key, the command that printed it, or a URL with its section heading. A `[VERIFIED]` value with no citation is a defect.
- `[INFERRED]` derived from verified facts by steps the walkthrough shows.
- `[ASSUMED]` not grounded in any source, such as an illustrative value or a fact found only on a blog or forum.

A value built from several sources takes the weakest marker. A value the flow needs that cannot be found and should not be guessed gets no marker: it goes under `Not known` with what was searched, and the walkthrough shows a blank or an `[ASSUMED]` stand-in named as such.

Never copy a secret, key, token or password value: name the variable. Personal data from a source that is not test data is masked (`j***@example.com`), and the answer says it was masked.

A search query carries only the general concept, never project code, names, customer data or secrets, because the query leaves the machine.

## Steps

| When | Read |
|---|---|
| a question arrives | `steps/10-gather.md`: pick the mode, find the actor, the entry point and the data |
| the data is grounded | `steps/20-walk.md`: write the answer in the shape below and check it |

Reference answers: `examples/admit-walkthrough.md` for codebase mode, `examples/etag-walkthrough.md` for concept mode. Read the one for the mode before the first walkthrough in a session.

## Output

```
**Question:** <the user's words, verbatim>
**Mode:** <codebase | concept | mixed> · **Actor:** <customer | QA tester | browser | ...> · **Entry point:** <screen, endpoint, command>

### Starting data

| Field | Value | Marker | From |
|---|---|---|---|
| <field> | <value> | [VERIFIED] | <path:line | command | URL, section> |

### Walkthrough

1. **<what the actor does>** at `<path:line or URL, section>`
   In: <values> · Rule: <the rule, with its marker> · Out: <values>

### End state

| Field | Before | After | Marker | From |
|---|---|---|---|---|
| <field> | <value> | <value> | [INFERRED] | <step n> |

### Not known

- <the value>: searched <where>; shown as <blank | [ASSUMED] stand-in>  | none

### Sources   (concept and mixed mode)

- <URL>: <what it grounded>
```

Every row of `Starting data` and `End state` has a marker and a `From`. Every walkthrough step names its code location or cited URL, the values going in, the rule and the values coming out. `Not known` is never dropped: write `none` when every value was found. `Sources` lists every page read, leads included.
