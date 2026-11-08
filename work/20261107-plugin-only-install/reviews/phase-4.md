## Review: 20261107-plugin-only-install · phase 4

CHANGES REQUIRED: T-4.6's "npm test passes" cannot be met here, because the mods step fails 25 status pane and band tests on Claude Code 2.1.319. The failure is environmental and the plan does not mark it deferred. The code itself is sound.

Alignment: FAIL: T-4.6 `npm test` half (environmental, see note)
Decisions: HONOURED (D-002 r5, D-003 r3)
Findings: clean

| ID | Criterion | Result | Evidence |
|---|---|---|---|
| T-4.1 | `hooks.json` names one composing module; only it exports `register` | PASS | `scripts/build.mjs` `hooksJson` writes `modules: ["./mods/index.tsx"]`; `src/mods/index.tsx` has one `on('session.start'`; the mod `hooks/index.tsx` files export handlers only. `test/repo/mods.test.mjs` "hooks.json names the one composing module" checks it. |
| T-4.2 | No `dist/mods/`, no mod manifests, `types` names the merged contract | PASS | `ls dist/mods` is absent; `src/.claude-plugin/plugin.json` sets `"types": "./hooks/mods/types/index.d.ts"`; `test/repo/mods.test.mjs` "the build writes no mod manifest" checks the contract has `'picket'` and no import. |
| T-4.3 | `claude plugin validate --strict dist` passes with no refusal text | PASS | I ran it: `✔ Validation passed`. |
| T-4.4 | `modEnabled` truth table and config warnings | PASS | `src/lib/shared/mod-switch.mts`; `src/lib/shared/config.mjs` `checkMods`; tests in `mod-switch.test.mts` and `test/kernel/config.test.mjs`. I did not rerun the unit step. |
| T-4.5 | Leak scan over built mods, planted leaks still reported | PASS | `test/repo/mods.test.mjs` (T-4.5 test and the planted-leaks test). |
| T-4.6 | Marketplace lists only `picket`; `mods.md` rows; `npm test` passes | FAIL | The marketplace and `docs/reference/mods.md` halves pass. `claude plugin test dist` gives 105 pass, 25 fail, in the status pane tests (the band T-6.4 and T-6.5 among them). The developer's base archive shows the same 25 at HEAD. |
| T-4.7 | Live session check | DEFERRED | QA, the release QA pass |
| T-4.8 | Off switch: no command, no clock, reply unchanged; both commands registered when config is absent | PASS | `src/mods/markdown/hooks/index.test.tsx` has three tests asserting `registered`, `intervals` and the unchanged `AssistantMessage` render. |

T-4.6 needs an architect amendment marking its `npm test` half `[DEFERRED: QA, ...]`, or a waiver. It is not a developer fix.

Craft lint is clean: no added comments, no excluded test kinds.

Checked:
- **Session start ordering:** the status band still sees `/picket-markdown` registered before it starts.
- **Off-switch failure mode:** a missing or unparseable config fails open, so the pane stays on.
- **Retired plugin ids:** `uninstall` now reads `RETIRED_PLUGINS`.
- **Cleanup:** no leftover marketplace entries or removed-manifest references.

I recorded the red-at-base fact in `/mnt/work/development/github/picket/.claude/agent-memory/picket-reviewer/mods-tests-red-on-2-1-319.md` and sent the verdict to the lead.

CHANGES REQUIRED
