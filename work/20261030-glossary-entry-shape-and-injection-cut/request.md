Implement artifacts/refactor/19-glossary.md: consulting's capture step owns the short glossary entry shape with an optional Pointer line and the long-entry rule; ratify.md and the glossary template name artifacts/strategy/glossary/; inject.state cuts .claude/MEMORY.md at the last whole entry at or under 6,000 characters and appends a note; a PostToolUse hook on writes to .claude/MEMORY.md warns past 6,000 characters and never blocks. The trimmed MEMORY.md itself is the lead's, after the user approves it.

## Brief
purpose: Keep the injected glossary whole and give glossary entries one short shape
in scope: capture.md short shape with Pointer and the long-entry rule; ratify.md and the glossary template path; inject.state cut at a whole entry with a note; a PostToolUse warning on MEMORY.md writes past 6,000 characters
out of scope: editing .claude/MEMORY.md (the lead does it after the user approves); moving development's memory; the bench
