Privacy: keep the consumer project's names out of Picket's tracked files.
1. test/cli/source.test.mjs: the fixture folder named after a consumer project's repository (lines 103 to 106) becomes the neutral `src/Webapp`.
2. New test/repo/private-terms.test.mjs: reads the untracked deny-list `.picket/private-terms.txt` (one case-insensitive regular expression per line, `#` lines and blank lines ignored) and fails on any tracked or untracked-not-ignored file line that matches one, reporting path, line number and pattern number but never the matched text. Skipped when the file is missing. A second test proves the scan on planted text without the file.
3. .gitignore: add `.picket/private-terms.txt`.
