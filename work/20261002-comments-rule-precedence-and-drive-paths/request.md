User request, verbatim: "if you find it usefull you can also adress this , Questions: should the target projects' language rule files (such as csharp.md ## Comments) also be edited, or is the always-loaded harness rule enough? ok with your suggestions"

Follow-ups to work item 20261002-near-zero-comments-ask-before-adding-one (closed at dc25134):

1. .claude/rules/comments.md states that it wins over any project rule (such as a language rule's ## Comments section) that allows comments or doc comments. A target project's csharp.md said one-line comments are fine without asking, which contradicts this rule.
2. .claude/lib/drive.mjs: `git ls-files --others` and `git status --porcelain` quote non-ASCII paths when core.quotePath is on (the git default), so removeFiles silently misses those files while reporting them removed. Read paths with core.quotePath=false (or -z) in both listings. Cumulative review minor at drive.mjs:94.
3. Two header comments in this repo are stale since the comments order: the usage header in .claude/bin/harness.mjs lacks the `harness comment` verb, and the kernel-owned list in the header of .claude/hooks/guard.scope.mjs lacks work/<id>/comments.jsonl. These are comment edits, so they go to the user as proposals on the Comments: line at the gate; nothing is written without the user's [k] keep.
