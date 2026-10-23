---
name: markdown-paths-facts
description: test/repo/markdown-paths.test.mjs scans agent memory files too, so memories cite full repo paths; it treats git-ignored paths (the dist folder) as missing and fails an ELSEWHERE entry that starts to exist (src after the item 01 move); ELSEWHERE matches exact paths only
metadata:
  type: reference
---

`test/repo/markdown-paths.test.mjs` (read 2026-10-22) lists files with `git ls-files --cached --others --exclude-standard`, so a backticked path under an ignored folder such as the built dist folder counts as missing. Its `ELSEWHERE` groups excuse exact paths only (a `Set`), and a second test fails when an excused path is no longer cited or now exists. The host-layout group lists the src folder, which exists once item 01 moves the old plugin folder there.

The test also scans the agent memory files under `.claude/agent-memory/`. A backticked short path there (shared/paths.mts in backticks) counts as missing and turns `npm test` red, which stalls the developer (the lead fixed one, 2026-10-23). In a memory file, write every repository path in full (`src/lib/shared/paths.mts`), or leave it out of backticks.

**How to apply:** any phase that moves files, adds an ignored output folder, or creates a folder named in `ELSEWHERE` must edit that test in the same phase, or `npm test` goes red. Related: [[verify-grep-patterns]], [[state-folder-facts]].
