## Review: 20261115-guard-rows-refuse-attached-program-flags · cumulative

Approved: the staged fix joins every program flag value, so the four commands that slipped through at 9bebfab7 are denied again and no command the base denied now passes.

Requirements: PASS (6)
Alignment: PASS (17)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: the guard denies gawk -e W -e1, php -B W -R'echo 1;', lua -e W -ex=1 and Rscript -e W -e1 to the lead and picket:developer; replaying the four new seeds against HEAD fails, so they were red before the fix; comparing base with the index on 22 argument shapes (php script.php plus a heredoc, a bare -r, -r followed by a -R-looking program, lua -, lua -l mod s.lua, gawk operand programs, R -f, --file=- and -f/dev/stdin, gawk -E/dev/stdin) finds no case the base refused that passes now, and gawk -e 1 -e W, open at base, is now closed; 72 of 72 tests pass in the four changed test files; the replay against 3ace7e50 exits 1 and names the 10 phase 2 and 3 spellings; no base line removed (0, 0, 0); no `programOperand: {` remains; silenced list empty; mutation killed; no comments added. The fix is staged, not committed (/mnt/work/development/github/picket/work/20261115-guard-rows-refuse-attached-program-flags/phases/3.fixes.md).

APPROVED
