Rename the marketplace from picket-dev to picketai before the first npm publish, so the plugin id users install is picket@picketai.
Change the name in .claude-plugin/marketplace.json and MARKETPLACE_NAME in core/lib/init.mjs (which also builds the plugin id and the plugin-cache read rule), the tests that name it (test/kernel/init.test.mjs, test/kernel/plugin-layout.test.mjs, bench/test/adapters.test.mjs), and the docs (docs/how-to.md, README.md, CONTRIBUTING.md, and the current decision lines in .claude/MEMORY.md). Records (work/, artifacts/, bench/results/) keep the old name.
The user approved the rename.

Also add the user-approved comment `# v4` after the pinned SHAs of actions/checkout and actions/setup-node in .github/workflows/release.yml (lines 22 and 26); the lead records the approval with picket comment.
Escalated from the fast lane: it touches 10 files.
