A user installed Picket and on the first prompt the lead skipped the lane admit chose: admit answered order for deleting three keys from a JSON file, the lead judged the lane too heavy, took admit's reason "not plainly small and not a heavy-lane trigger" as a sign the call was borderline, and edited directly.

Fix lane admission so the lead never overrides the lane:
1. In core/templates/claude-block.md (and the repo's own CLAUDE.md, which mirrors it and has a 2048-byte budget with about 5 bytes free) add one sentence saying the lane is admit's call, a change that looks too small for its lane still takes it, and only the user overrides it.
2. In core/lib/admit.mjs change the fallback reason "not plainly small and not a heavy-lane trigger" to a plain fact (for example: no small-change word and no file named; order is the default).
3. Treat removing or deleting a key, line, entry, setting or hook as a small-change signal ("remove the broken hooks" lands in order today, "Fix or remove the broken hooks" lands in fast).
4. Detect dotted repo paths like .claude/settings.json written without backticks, when the file exists.
Add tests in test/kernel/admit.test.mjs.
