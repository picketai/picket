---
name: testing
description: >
  Black-box testing of a finished order or design item against its request: a matrix of the
  tested criteria by case kind (normal, boundary, negative, permission, state, integration), one
  case card per risk run on the item's own stack, the saved scenarios replayed, every failed
  case classified as product, test or environment with runtime evidence, the cells left
  unproved recorded, and at most three business questions asked as choices. The kernel derives
  the verdict and writes the report. Use when the tester checks a finished item at the test
  stage, or retests it after a fix round. Loaded by the tester agent; never invoked by the user.
user-invocable: false
---

# Testing

Prove the request on a running system, from the outside, one risk per case. These steps decide what the tester records through `picket test case`, `picket test classify`, `picket test note` and `picket test ask`; the kernel turns the records into the report and the verdict.

## Steps

1. Read the brief the send names. Its criteria are the tested criteria: the `covers` of the item's approved HTTP checks. The request beside them is context for the case kinds and the questions, never a list of extra criteria.
2. Build the matrix of criteria by case kind: read `steps/matrix.md`. It decides which cells get a case, which get a cell note, and how the cap is spent.
3. Write and run each case: read `steps/cases.md` for the card grammar, the test data, the login and the run itself.
4. Replay the saved scenarios with `picket env replay <id>` on the same stack. A saved scenario that fails is the kernel's to classify; you only read its line.
5. Classify the failed cases, record the cells you did not run and ask your questions: read `steps/results.md`.
6. Run `picket test report <id>`. It prints the counts line and `verdict: <token> · route <route>`, or the cases still unclassified. The block repeats both, and its last line is that token.

## Rules

A black box reads the request, the brief and unchanged files, never the change: no diff, no plan, no block, no source file the item touched. The guards enforce it; a denial means the path is part of the change.

Code decides what code can decide. The runner decides each case's outcome, the kernel counts the rows, derives the verdict and refuses any other token. The tester states only what code cannot know: the risk a case checks, the class of a failure, why a cell was not run, the question.

One case, one risk. A case that checks two things fails for one of them and proves neither.

No exploratory testing: a case that names no tested criterion is not run. A defect seen on the way goes into a question or the block's sentence, never into an unplanned case.

Runtime evidence only. A class, a cell note or a question cites what the stack answered (status, body text, the failing step), never what the code probably does.

Secrets never appear in a card, a note or the block: a password or token is a `{user:<role>.<field>}` placeholder, and the runner keeps answers out of the rows.

## Output

The tester's block, as the tester shell's Output shows:

```
## Test: <id> · round <n>

<one sentence: the verdict picket test report printed and its first reason>

Report: work/<id>/test.md
Results: <the counts line picket test report printed>
Questions: none | <n> asked

<the token picket test report printed>
```
