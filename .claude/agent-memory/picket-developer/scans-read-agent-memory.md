---
name: scans-read-agent-memory
description: repo scans (markdown-paths, paths .claude substring, plugin-layout import regex) trip on text that is not code; agent memory files can turn npm test red
metadata:
  type: feedback
---

test/repo/markdown-paths.test.mjs reads untracked .claude/agent-memory/**/*.md too: a reviewer memory citing the bare state folder name, in backticks and without its .picket prefix, turned npm test red on 2026-10-23 during item 07b. Other scans match plain text: test/repo/paths.test.mjs flags any code line containing ".claude" (`INSTALL.claudeMd` matched as a property), and test/repo/plugin-layout.test.mjs reads `from "${x}"` inside a string as an import.

**Why:** each cost a check cycle; the memory-file one is outside the developer's files.

**How to apply:** when a check fails on a .claude/ file you did not write, report the exact line to the lead ([[claude-dir-edits-via-lead]]) and do not change code to work around it; when your own string trips a scan, reword the text and say why on the block.
