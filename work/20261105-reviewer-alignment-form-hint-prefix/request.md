Two minor review findings:
1. src/agents/reviewer.md: the Output template's Alignment: line shows only PASS | FAIL | UNCLEAR; it should also show the pr form that names its sources, as the alignment checklist states.
2. src/lib/shared/git.mts: commitOwned's reset hint compares add paths (relative to the project root) with committed paths (relative to the git top level); when the project root is a subfolder of the git top level, underAny never matches and the hint mixes the two bases. Give the add paths the repo prefix before comparing and printing.
