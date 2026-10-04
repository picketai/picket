# Proofreading: the five passes

Run them in order and keep them separate; mixing passes turns a typo hunt into a rewrite. Hunt one error class per sweep, and read the sentences in reverse order for the spelling and grammar sweep so meaning cannot carry you past a broken one. Never trust a spell checker or instinct on a homonym: check the word, and check every product, person and API name against the repository or the user.

## Pass 1: mechanics and grammar

Six sweeps: spelling and homonyms; punctuation (commas, apostrophes, terminal marks, quote and bracket pairing); verbs (tense shifts, passive hiding the actor); subject and verb agreement; pronouns (antecedent agreement, two-way references); other grammar (fragments, run-ons, misplaced or dangling modifiers). Then markdown integrity (heading levels, list numbering, balanced and labelled fences, well-formed tables) and link integrity (relative links resolve on disk; external links reported as unverified unless fetching is allowed).

Run the mechanical sweeps with tools:

```bash
f=<path>
grep -nEi '\b([a-z]+) \1\b' "$f"                                  # doubled words
grep -nE '\b(its|it.s|affect|effect|their|there|they.re|your|you.re|then|than|principle|principal|complement|compliment|ensure|insure)\b' "$f"
grep -nE '[—–]' "$f"                                              # dashes (house style)
grep -nE ' +$' "$f"                                               # trailing whitespace
grep -nE '\b(TODO|TBD|FIXME|XXX|Lorem ipsum)\b' "$f"             # leftovers that must never ship
grep -cE '^```' "$f"                                              # fence count must be even
grep -nE '^#{1,6} ' "$f"                                          # heading ladder
grep -oE '\]\([^)#][^)]*\)' "$f"                                  # relative links: test each target
```

The homonym grep lists candidates; keep only the wrong ones.

## Pass 2: internal consistency and facts

One name per concept, agreeing with `.claude/MEMORY.md` when the project has a glossary. Numbers that must agree do. Dates, versions, environment names, endpoints and paths match reality: check identifiers against the repository when the document describes this project. Cross-references resolve. Examples work: flags exist, JSON parses, code would compile. Unverifiable → L3 question; contradicted by the repo → L0 with the evidence quoted.

## Pass 3: clarity for the named audience

Read as the reader from step 0, who cannot ask a question. The opening says what the document is and for whom; every acronym is expanded on first use or dropped; each sentence has one reading; instructions run in execution order and name their actor; anything the reader must do is an action, not an implication; every abstract claim that matters carries one concrete example. The test for an instruction: could a competent stranger follow it without a second document?

## Pass 4: house style

For prose authored in this repo: `.claude/rules/prose.md` (no dashes, prose over bullets, plain English with examples, lead with the answer, no preamble or closers). Level 2, or L0 when the user made house style binding. An external style guide replaces this pass; ask for it.

## Pass 5: completeness and safety to send

What is not there: prerequisites, the failure path, a version or scope statement, a contact or next step, an unstated setup assumption, an unhedged promise. And what must not leave the building: internal hostnames, credentials, tokens, customer names, unreleased plans, personal data. A sensitive hit goes to the top of the report.
