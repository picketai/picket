Three small follow-ups from the kernel fixes review:
1. parseBlock: a bulleted line under a field (for example "- **Red:** ..." under "Verified:") stays part of that field's value instead of opening a new field.
2. parseBlock or the proposals reader: "none." with a trailing period counts as none on Comments: and Waivers:, so the packet shows no proposals and no [k] or [w] options.
3. Add the missing test for commitOwned's reset hint when an add path is a file, not a folder (src/lib/shared/git.mts:229): under a held index lock, add ["work/x/", "docs/r.md"] gives a hint ending "; run git reset -q -- work/x/ docs/r.md src/a.js", so the === to !== mutant fails.
