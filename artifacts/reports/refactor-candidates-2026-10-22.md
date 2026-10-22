# Refactor candidates, 2026-10-22

A list for readability and maintainability, gathered from four read-only audits (kernel, hooks, prose, periphery). No work items exist for any of it yet; `picket admit` picks each bundle's lane when it becomes one. Bugs B1 to B7 were confirmed against the code; line references from the hooks audit outside `guard.bash.mjs` need a re-check before use.

## Bugs (behaviour changes)

| # | Where | Bug |
|---|---|---|
| B1 | `core/lib/hooks/guard.bash.mjs` | Readers with write or exec flags are allowed: `find -fprint`, `find -fls`, `tree -o`, `git log --output`, `rg --pre`. The source rule knows these flags, the general classifier does not. |
| B2 | `core/lib/drive.mjs:108` | `git checkout -- "p"` runs through a shell; `$` and backticks in a path expand on POSIX. |
| B3 | `core/lib/admit.mjs:57`, `core/lib/review.mjs` | Security paths matched with bare `startsWith`; `gate.mjs:72` normalises. `src/payments/**` never sends admit to design; `src/pay` matches `src/payment-ui`. |
| B4 | `core/lib/work.mjs:207,251` | One truncated line in `verdicts.jsonl` throws, so `next`, `state` and `route` fail for that item. |
| B5 | `core/lib/tooling.mjs:20` | `["*.sln"].some(...)` never looks for a `.sln` file. |
| B6 | `core/lib/styling/terminal.mjs:57` | Terminal.app never sets `run.fontSet`, so the Nerd Font icons step is always skipped there. |
| B7 | `scripts/test.mjs:5`, release workflow | `npm test` and CI never run the mod suites; a broken mod can be published. |
| B8 | `core/lib/tooling.mjs:12` | A malformed `package.json` makes `detectTooling` throw, crashing `check`, `drive`, `verify`, `mutate`, `preflight` and the `guard.bash` test lookup. Found 2026-10-22 in item 04c. |
| B9 | `core/lib/drive.mjs:35`, `hooks/observe.drive.mjs:15` | Drive evidence goes to the alphabetically last open item, while `next --latest` names the most recently active one. Found 2026-10-22 in item 04c. |

## Bundles

1. **Guard and kernel bug fixes.** B1 to B5, with the one root-keyed rule table in the guard, `gitRead`/`gitRun` with argument arrays, and one `readJsonl`/`appendJsonl`.
2. **Instruction consistency.** Stale facts in `rules/work-items.md` (`picket state` reads, `picket set` writes) and the reviewer contract; three gate packet descriptions that disagree with `packet.mjs`; repeated paragraphs (Jira intake, drive, caps, amendment) cut to one owner; `prose.md` owns what it shares with `custom.md`; shared steps out of `ordering/` and `expediting/`; step numbering; 59 dashes in the ticketing templates; lanes described once in the docs.
3. **Kernel structure.** Verb table instead of the 324-line switch in `picket.mjs`; one `Refusal` class caught in `main`; `artifact.mjs` and `block.mjs`; constants for work file names, markers and verdict tokens; uniform `verb(id, { root, ...opts })` returning `{ ok }`; dead exports removed.
4. **Hook structure.** Split `guard.bash.mjs` (1497 lines) into text, command rules, source rule, wrapped payloads; one evaluator for Bash and PowerShell; `hook-output.mjs`; one block heading table; no handler importing another handler; hook tests split per handler with shared fixtures.
5. **Mods and tests.** B6, B7; session mod `palette.ts`; one copy of each formatter (`compactTokens` gives "200.0k" and "200k" today); session register test before splitting the render handlers; `manifestItem()` and `terminals/dconf.mjs`; `test/support/{cli,git,repo}.mjs`.
6. **Hygiene.** Prune `bench/results` to `baseline-trunk.json`, `plugin-2026-10-18.json`, `ask-probe.json`; remove `.claude/bin/statusline.mjs`; regroup `.gitignore`; commit or delete `work/20261018-add-a-picket-debugging-skill/`. Leave `work/` as it is. The unused vitest, tsc and eslint allow entries in `.claude/settings.json` are the user's call.
7. **TypeScript source compiled to `.mjs`, with bundled hooks.** Accepted direction (2026-10-22). Superseded by `artifacts/refactor/01-layout-and-build.md`: `src/` builds into `dist/`, the compile cache is dropped (measured no gain), and conversion happens bottom-up as items touch the code instead of a first pass on the 89 errors.
   1. Build skeleton: `typescript` as a dev dependency, `tsconfig.json` (`module nodenext`, `strict`, `rootDir src`, `outDir core`), `npm run build`, built in `prepare`, `prepack`, `npm test` and `npm run claude`.
   2. Move the kernel and hook `.mjs` files to `src/` unchanged and build them with `allowJs` and `checkJs`; bring the 89 type errors found in `core/` to zero (some are real drift: `picket.mjs:246` passes `reason`, `drive.mjs:158` reads an undeclared `env`, `admit.mjs:131` returns `skill`).
   3. Convert module by module to `.mts`, kernel first, so bundles 3 and 4 land in TypeScript instead of churning twice.
   4. Bundle each hook into one file at build time (esbuild as a dev dependency), and turn on Node's compile cache where it exists (`module.enableCompileCache?.()`) with its folder under `.picket/state/`, never under the plugin root. Measure every hook against the 200 ms budget before and after; `guard.bash` is about 150 ms today, unmeasured target.
   5. Amend the 2026-10-04 "no build step" decision in `.claude/MEMORY.md`; update `CONTRIBUTING.md`, `.claude/rules/harness-authoring.md` and the README layout; point the shell-shape and handler-source tests (`test/hooks/handlers.test.mjs:87,97`) at `src/`.

   Not chosen: running `.ts` directly (Node refuses type stripping under `node_modules`, `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, and stripping cost 88 to 203 ms on a 1537-line file); Python (no runtime guarantee, second toolchain); Rust (saves about 230 ms per tool call but needs six platform binaries and a 27,000-line rewrite).

## Suggested order

Bundle 1 first in `.mjs` (small, fixes real holes). Then bundle 7 steps 1 and 2, so the remaining refactors are written once in TypeScript. Then 3 and 4 alongside bundle 7 step 3, then 5 and 2, with 6 any time.

## Open decisions

1. Is "accept as is" an option at a stall? `ordering/SKILL.md:46` says `[x] abandon`, `ordering/steps/40-review.md:36` says `[x] accept as is`, the kernel offers `[c] continue · [x] abandon`.
2. Render the design lane's `[i]` irreversible option in the kernel, or drop it from the prose?
3. Shared step files: a lane-neutral home, or relax the one-hop rule?
4. The finding separator is an em dash that `pr.mjs` parses: name it as an exception in `prose.md`, or change the separator?
5. Resolved in item 01: `dist/` is never committed. Original text: built `.mjs` in git: recommended not committed (ignore `core/**/*.mjs` except `core/lib/vendor/`, build on `prepare`); the alternative commits them with a CI check that a rebuild leaves no diff.
