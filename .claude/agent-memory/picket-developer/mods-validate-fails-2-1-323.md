---
name: mods-validate-fails-2-1-323
description: when npm test's plugin validate or mods step fails on host drift; mods matched Claude Code 2.1.325, and 2.1.326 (seen 2026-11-17) adds TS2740 plus ICON_MISSING
metadata:
  type: project
---

Since 2026-11-14 the mods match the hook API types of Claude Code 2.1.325. On 2026-11-17 the host was 2.1.326 and `npm test` failed at its last stage on trunk itself: `mods: the mods do not match the hook API types of Claude Code 2.1.326: 1 type errors` (`hooks/mods/status/hooks/index.test.tsx:173:37 TS2740`), and `claude plugin validate --strict` also warns `ICON_MISSING`, which `--strict` turns into a failure. Every unit test before that stage passed. That is drift in the installed host, not the phase.

**Why:** a phase otherwise spends a turn proving the base fails the same way.
**How to apply:** on that header, build the base in scratch (see [[base-red-via-archive]]: `git archive HEAD | tar -x -C <scratch>`, symlink `node_modules`, `npm run build`) and run `claude plugin validate --strict --json dist` there; if it shows the same TS code and warnings, report Tests as failed pre-existing. `rm -rf` in the scratch command is denied by guard.bash; use a fresh folder name instead.
