---
name: mod-engine-api-facts
description: Where the Claude Code mod engine types live here, and engine and host facts a mod design rests on (command.run queues, immediate commands, band Buttons, session registry, nested worktree removal, test fs paths resolved against plugin root, scratch probe plugin)
metadata:
  type: reference
---

Checked 2026-11-02 while designing work/20261102-session-list-merges-into-picket-status-design:

- The engine API is typed in dist/mods/session/.claude-plugin/types/claude-code/index.d.ts (about 17,000 lines, Claude Code 2.1.316, an ignored build folder); `test/repo/mod-contracts/claude-code.d.ts` is only a 3-line stub. `scripts/build.mjs` wipes the built mods folder, so that types folder is written by the Claude tooling, not the build; if it is gone, look under another built mod's .claude-plugin folder.
- `CommandSpec.immediate?: true` runs a typed command mid-turn; `$.command.run` is documented as "queued and run once the session is idle", so a band button that runs a command may wait for the turn.
- `Button` works in the `AbovePrompt` band. Any plugin reads any plugin's `$.state`; only the owner writes it, and another plugin reacts by hooking `state.set`.
- Claude Code's live session registry is the sessions folder of the Claude config dir, one pid-named JSON file each, with `sessionId`, `cwd`, `status` (`busy`, `waiting` seen) and `name`/`nameSource`. Transcripts sit in the projects folder under the root with non-alphanumerics turned into hyphens, one id-named jsonl each.
- `git worktree list` run from an umbrella does not list a nested repo's worktrees, so a removal command for a Picket worktree under a nested repo needs `git -C <repo>`. The guard denies running `git worktree remove` even in the scratchpad.
- The SDR-00002 canvas boards (WorkPane, BandEntry) are not in the scratch canvas folders under .picket/state; since 2026-11-02 local copies sit in tmp/canvas-spec/project/ (HTML with the render logic inline, sample data). The engine types promise Text `underline` and Box `height`, but no top border on a Box, so a rule row is drawn as text.

Seen 2026-11-08 (item 20261108-fix-25-failing-status-mod-tests, Claude Code 2.1.319, Linux): under `claude plugin test`, a path that is relative on the host reaches the test's `fs.list`, `fs.read`, `fs.write` and `fs.stat` handlers resolved against the plugin root, so a Windows fixture `D:/repo` arrives as `<plugin root>/D:/repo`; `process.run` argv is not touched. A probe plugin in the scratchpad (a plugin manifest with name and version, a hooks file holding `{"hooks":{},"modules":["./mods/index.tsx"]}`, a mod and a `.test.tsx` that records `e.path`) runs with `claude plugin test <dir>` and answers engine questions in 0.1 s.

**How to apply:** read the types file before designing a mod hook, and put any engine behaviour the types do not state behind an open question. Related: [[mod-theme-tokens]], [[claude-cli-plugin-facts]], [[next-and-mod-couplings]].
