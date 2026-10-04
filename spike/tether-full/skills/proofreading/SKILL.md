---
name: proofreading
description: >
  Proofread a document that will be read outside the team (public docs, a customer email, a
  README, a release note, a spec for another company) and report every defect as a located,
  quoted, rule-backed finding before any text changes. Five passes: mechanics and grammar,
  internal consistency and facts, clarity for the named audience, house style, completeness
  and safety to send. Use when the user says "proofread this", "check this before I send it",
  "is this clear?", "polish this email", "review this doc for typos", or hands over prose whose
  next reader is outside the project. `/proofreading <path or pasted text>`.
user-invocable: true
---

# Proofreading

Input: `$ARGUMENTS`, a path, a directory, a URL or pasted text. Empty: ask which document; stop. Never proofread "the last thing we discussed" by guess.

## Four rules that outrank every check

1. Report before you change. The deliverable is a findings list; rewriting happens only on request, and only for accepted findings.
2. Preserve the author's voice. A long but clear sentence on register is not a finding.
3. Never invent a fact. A number, name, date, version, price, link target or claim you cannot verify from the document or the repository is a question for the author, not a correction.
4. Every finding quotes the text and names a rule. Otherwise it is an opinion: drop it.

## Step 0: scope the read

State on one line: audience (ask if unknown; clarity is measured against a reader), purpose (what the reader does next), surface (email, docs site, README, PDF, ticket, changelog; infer from the path and say so), and whether house style applies (yes for prose authored in this repo; external style guide → check against that instead; default: house-style hits at L2).

Read `references/recurring-errors.md` before pass 1; append a line when a defect class repeats across documents.

## Levels

| Level | Meaning | Action |
|---|---|---|
| L0 | error: misspelling, doubled word, agreement, fragment, broken markdown, dead relative link, list numbering, unbalanced fence, wrong product-name casing | report the exact replacement; safe to apply without a per-item question |
| L1 | clarity defect: ambiguous pronoun, undefined acronym on first use, two readings, missing step, passive hiding the actor, dangling modifier | report a proposed rewrite; apply only on go-ahead |
| L2 | style or preference: house-style hits, tone drift, harmless redundancy | list compactly; never apply unasked |
| L3 | substance: unverifiable claim, numbers that do not add up, an unkeepable promise, a missing caveat, anything legally loaded | ask; never fix; blocking when the document leaves the company |

Minimal intervention: change what is wrong, leave what is merely different. No silent substantive edits: a change that alters meaning is authorship and goes back to the author.

## Steps

| When | Read |
|---|---|
| the five passes | `steps/10-passes.md` |
| the user says "apply", "fix them", "apply the L0s" | `steps/20-apply.md` |

## Output

```
**Proofread:** <path> · **Audience:** <who> · **Purpose:** <next action> · **Surface:** <kind> · **House style:** <applied | reported only | external guide: X>

**Blocking (L3 / sensitive):** <one line each, or none>

| # | Loc | Lvl | Finding | Current | Proposed |
|---|---|---|---|---|---|
| 1 | L42 | L0 | Doubled word | "the the request" | "the request" |

**Verdict:** READY TO SEND | NEEDS FIXES (n L0, n L1, n L2, n L3)
```

`Loc` is a line number for a file or a short quoted anchor for pasted text. Quote the smallest span that shows the defect. Every L0 and L1 row carries a paste-ready proposal; an L3 row's proposal is the question. More than five L2 rows collapse into one row with a count. `READY TO SEND` needs zero L0 and zero blocking L3. A sensitive-content hit sits above the table however clean the rest is.

Several documents: one table each, worst first by L0 count, then one cross-document section for terminology that differs between them.
