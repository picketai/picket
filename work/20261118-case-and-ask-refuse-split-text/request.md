Fix picket test case and picket test ask so they refuse extra words, as picket test classify and picket test note now do: an unquoted --intent an empty basket saves the intent "an", and an unquoted --question or --basis keeps only its first word. Make both answer a usage error and save nothing. Change the ask usage (src/lib/verbs/test/ask.mts) to show --question "<text>" and --basis "<text>" in double quotes. Reword src/skills/testing/steps/results.md line 3, which still says that unquoted classify "keeps only the first one": classify now refuses the extra words.

## Brief
purpose: Close the last two verbs that cut a tester's unquoted text to one word, and make the ask usage and the results step say what the kernel now does.
in scope: src/lib/verbs/test/case.mts and ask.mts (refuse extra words, quoted ask usage), src/skills/testing/steps/results.md line 3, their unit tests, and docs/reference/cli.md by regeneration
out of scope: classify and note, already done; the bench grader and keys; any paid benchmark run; rows already saved with cut text; the setting testing
