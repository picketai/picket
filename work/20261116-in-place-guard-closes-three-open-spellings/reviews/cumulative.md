## Review: 20261116-in-place-guard-closes-three-open-spellings · cumulative

Approved: the amendment rewords T-1.3 to match D-004 (r2) and closes OQ-003, and the staged code is the same as the last pass (6 files, 69 insertions, 6 deletions).

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A flag cluster that ends in an attached program ... the guard reads the program after the last program flag letter in the cluster and refuses the write." | request.md:3 | PASS | interpreters.mts:43-56, in-place.mts:80-96. php, gawk, perl, ruby, python3, node and bun attached cluster writes are denied. |
| S-2 | "A script path that is standard input ... for every interpreter row, and refuses the write." | request.md:4 | PASS | in-place.mts:9,59,65; the replay names every row on all three paths. |
| S-3 | "A program piped in from another command ... the guard checks that text as the program and refuses the write." | request.md:5 | PASS | in-place.mts:110-118; plain, wrapped, brace-group and bash -c echo and printf are denied. |
| S-4 | "The closure test of the in-place guard stays closed and gains these spellings as seeds or families." | request.md:7 | PASS | in-place.variants.test.mts passes; the replay at 4584e779 exits 1 naming all new seeds. |

Alignment: PASS (20). T-1.3 now matches test/repo/variants.test.mjs:107-109: the node pin is unchanged, the python3 pin is as D-004 (r2) states, and the ruby pin is the one T-1.3 names. variants.test.mjs: 20 pass, 0 fail.
Decisions: HONOURED
Regression: 1 unrequested behaviour change: D-003 (r2) reads echo and printf text from the whole command and from any word of a segment. It only adds refusals, and probes found no new refusal of a read.
Sources: none
Questions: OQ-002 (order.md:230) is still open for the product owner: should echo text anywhere in the command count, or only the segment that feeds the pipe?
Findings: clean
Classes: none
Checked: `echo '<write>' | bash -c python3` and `deno eval` with `Deno.writeTextFileSync` pass now and passed at base; neither is a spelling the request names. The fix is staged, not yet committed.

APPROVED
