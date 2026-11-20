---
name: bench-run-transcripts
description: where a bench run's case steps survive after the run dir is gone; result records keep only grade checks
metadata:
  type: reference
---

A bench result record (bench/results/*.json, records[].grade) keeps only check names and counts, and run_dir is null after the run, so a tester's case cards and test rows are gone from disk. The steps survive in the run's transcripts: find the record's session_ids[0] under /home/vlad/.claude/projects/-mnt-work-development-github-picket-bench--runs-<task>-r<n>-<suffix>-repo/<session>.jsonl, and the tester's own commands (picket test case heredocs, classify evidence) under <session>/subagents/agent-*.jsonl. Parse tool_use inputs with JSON.parse per line. Used 2026-11-18 to verify which case the test-01 grader counted as a false alarm. See [[verdict-hook-drive]].
