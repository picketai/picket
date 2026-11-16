## Review: 20261116-guard-closure-checks-derive-their-spellings · checkpoint (phases 1 to 3)

Phases 1 to 3 meet every criterion, and each of the nine replays fails on its rejected tree with the label in the family block, not only in the probes.

Alignment: PASS (T-1.1 to T-1.7, T-2.1 to T-2.8, T-3.1 to T-3.7)
Decisions: HONOURED
Findings: clean

Checked:
- Ran the 12 touched test files: 88 and 34 tests pass, 0 fail. I did not rerun the full `npm test`, since it is the `picket verify` step and the block reports it green.
- Replayed all nine declared trees; all exit 1.
- The labels sit under the family header, not only in the probes: `node --eval=` under program flag spellings at 2f702e9a, `-X utf8 - <<` under stdin spellings at e4addfe2, `open F, '> src/a.pl'` under perl open modes at affc4412, `-r1` under program flag spellings at 9bebfab7.
- The five plan greps hold: no `ClosureCheck` or `checks:`, no literal `SECRET_WORDS` array in the test, `perl open modes`, `splitAlternatives` and `deno` present in `test/support/variants.mts`, `"FAMILIES"` in the in-place closure.
- Removed-guard check on `src/lib/hooks/guard/bash/in-place.mts:31-38`, `subcommandProgram`. It reads every non-flag word after `eval` where it read `args[1]`, so it only widens. Probe: `deno eval -- '-1;<write>'`, `-p` and `--ext=ts` forms still yield `src/a.ts`. No regression.
- `splitAlternatives` counts recomputed from the source: 8, 2, 2 and 7. 4×2×3×3 = 72.
- Se4 on the changed guard `inPlaceTargets`: the new spelling (`deno eval --quiet`) is seeded and closed. I found no input left uncovered.
- Gates: no `silenced` entries, no comments added, no integration tests added.

APPROVED
