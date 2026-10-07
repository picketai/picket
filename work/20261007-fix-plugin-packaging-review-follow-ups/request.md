lane: order. Fix follow-ups from Package core as the plugin (20261006-package-core-as-the-plugin-design):
- filename.mjs takes the project root from projectRoot() in core/lib/paths.mjs instead of four folders above the script, so SDR/ADR numbering works in installed projects.
- observe.drive KERNEL_CALL anchors the tether launcher to a segment's first word, like guard.bash kernelVerbStart, so `cd ~/src/tether && npm start` counts as a drive.
- benchmarking SKILL.md usage and description say plugin|trunk, not rework.
- delete comments naming old harness verbs in tether.mjs, packet.mjs, unsafe.mjs, work.mjs, repos.mjs, review.mjs, sources.mjs, pr.mjs.
- ignore spike/.runs/ in .gitignore.
- core/bin/tether launcher exits 126 with '/c/Program Files/nodejs/node: Permission denied' at line 2 inside bench repos (seen in gate-13 of bench/results/plugin-core.json).
