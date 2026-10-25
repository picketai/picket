lane: fast
Make the mods job block a release in .github/workflows/release.yml: remove `continue-on-error: true` from the mods job and add mods to the publish job's needs. A CI run passed all mod suites on Linux (OQ-001 of the item 06 refactor is answered).
