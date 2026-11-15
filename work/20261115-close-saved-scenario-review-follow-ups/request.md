Follow-up to 20261115-saved-scenarios-and-kernel-replay: close what its reviews left open in the saved scenarios.

1. The secret-name list matches the word `code` inside ordinary keys such as `countryCode`, `postalCode` and `statusCode`, so the drive log masks them and the check is not kept as a saved scenario. Narrow the match so those keys pass while real secret names (`authCode`, `passcode`, `code` on its own in an auth exchange if the list already treats it so) are still masked and refused. The closure tests of the mask and the card rule stay closed and gain these spellings.
2. The card rule in `scenarioProblems` passes a literal secret nested under a secret-named key, such as `{"secret":{"value":"hunter2"}}`. Refuse it at any depth, as the drive log's mask already does.
3. A scenario that fails and then passes prints as `passed`; only the stored row says `unstable: true`. Print and summarise it as `unstable`, still not blamed on the change.
4. `base-run.mts` copies three private helpers from `start.mts`. Export them from `start.mts` and remove the copies.
5. The fast-lane close accepts the latest `--affected` replay without checking its key against the working tree, so an edit made after the replay still closes. Compare the keys the way verify does and refuse a stale replay.
6. On approval the kept scenario files are written before the phase commit; if the commit fails they stay uncommitted. Write them only after the commit succeeds, or restore them when it fails.
7. `--affected` drops a scenario whose card does not parse, where a full replay reports it `blocked`. Keep such scenarios in the affected set.
8. `replay.test.mts` gains the missing `affected` case with no container engine, and the error casts in the scenario code check `instanceof Error`.

## Brief
purpose: Close the gaps the checkpoint and cumulative reviews of the saved scenarios left open, so ordinary checks are kept and the safety rules hold at any depth
in scope: the secret-name match on code, nested literal secrets in the card rule, the unstable print, the duplicated start helpers, the stale replay at fast close, kept files on a failed commit, unparsable cards under --affected, the missing affected test and the error casts
out of scope: build step 4 (the tester), the in-place guard's open spellings, results shared across machines, any change to the card format
