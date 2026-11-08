Install Picket without a global npm install: one npm package, one plugin, optional status line, cost moved off screen.

Goal: Picket reaches a machine only as a Claude Code plugin. No `npm install -g`, no second copy, portable committed settings.

1. Distribution (single package, single plugin)
- The build writes a package.json into dist/ and the release publishes @picketai/picket from dist/, so the package root is the plugin (.claude-plugin/plugin.json, bin/, skills/, hooks/ ...). That package.json keeps "bin": {"picket": "bin/picket.mjs"} so the same package serves npx.
- Fold the picket-status and picket-markdown mods into the main plugin: one hooks/hooks.json with Picket's command hooks plus `modules` for both mods. The markdown pane gets an off switch in .picket/config.json (e.g. mods.markdown: false), read by the module.
- .claude-plugin/marketplace.json at the GitHub repo root has one entry: {"name":"picket","source":{"source":"npm","package":"@picketai/picket","version":"alpha"}}, plus renames null for picket-status, picket-markdown and picket-session.
- Release script publishes the one package on the alpha dist-tag.

2. init
- Bootstrap is `npx @picketai/picket@alpha init`.
- Register the marketplace as {"source":"github","repo":"picketai/picket"} instead of the npm folder's absolute path; drop marketplaceRoot() and directory-path logic in src/lib/verbs/init/init.mjs.
- Install only picket@picketai; on re-run, replace an old directory-path picketai marketplace entry and uninstall picket-status, picket-markdown, picket-session if present.
- Warn when `picket` on PATH resolves outside the plugin cache (a global copy shadows the plugin's bin/) and suggest `npm uninstall -g @picketai/picket`.
- Stop setting statusLine by default (see 4). Update `picket uninstall` to match.

3. The picket command
- Inside sessions it comes from the plugin's bin/ (dist/bin/picket, picket.cmd), on the Bash tool's PATH. Skills, agents, CLAUDE.md block, permissions and the Bash guard keep calling bare `picket`; no change there. Hooks unchanged.
- Admin verbs run by hand (init, uninstall, extension add, style apply/remove) go through `npx @picketai/picket@alpha <verb>` or a session.

4. Status line: optional and cosmetic
- Remove the cost field and recordSessionCost; the status line has no side effects.
- Bundle it as one self-contained statusline.mjs with no imports from the rest of Picket. A SessionStart hook copies it to the plugin data folder (~/.claude/plugins/data/picket-picketai/).
- `init --statusline` (opt-in) writes statusLine pointing at that stable path. Picket's own info stays in the status mod band.

5. Cost
- Remove session_cost_usd from ledger turn rows and the cost-file reader in the ledger hook (ledger v3, or a reader tolerant of v2 rows).
- `picket cost` reports tokens per agent, phase and work item from the recorded `usage`.
- `picket close` prints and saves in work/<id>/ an audit line from that item's ledger rows: lane, phases, tokens per agent, bounces, blocks, wall time.

6. Unchanged: `npm run claude` / --plugin-dir dist for developing Picket; kernel verbs, lanes, agents, work-item state; bench (reads cost from claude -p).

7. Docs: docs/how-to.md (install, check, teammate, update via /plugin update, uninstall, command not found, optional status line, markdown pane switch), README.md install line, docs/reference/cli.md (cost, close, init --statusline, statusline), docs/reference/mods.md, CHANGELOG migration note (re-run init, uninstall the global copy).

To verify: plugin bin/ on PATH live (incl. picket.cmd on Windows); npm source with the plugin at the package root end to end; one hooks.json holding command hooks plus two mod modules; first-session blank status line; $HOME quoting in the Windows status line command.

## Brief
purpose: Picket reaches a machine only as a Claude Code plugin: no npm install -g, no second copy, portable committed settings.
in scope: dist package.json and npm publish from dist; fold status and markdown mods into the main plugin; marketplace.json with npm source; init via npx with github marketplace; PATH shadow warning; optional self-contained status line; remove cost from status line and ledger; picket cost and close audit from usage; docs and changelog.
out of scope: npm run claude dev flow; kernel verbs, lanes, agents, work-item state; bench cost reading.
