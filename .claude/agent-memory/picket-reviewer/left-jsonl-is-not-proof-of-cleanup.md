---
name: left-jsonl-is-not-proof-of-cleanup
description: a left.jsonl row logging an rm for a stray drive path does not mean the path is gone; ls it
metadata:
  type: feedback
---

When a phase block says a drive wrote outside the scratchpad and `left.jsonl` logs the cleanup command, `ls` the path. On 20261029-route-verdicts-on-continued-turns-drift-amends the log held `rm -rf C:/Users/vlad.apetre/work` but `chained-item` was still there at review time.

**Why:** `picket leave` records the command for the user to run; it does not run it.

**How to apply:** in cumulative reviews, check every out-of-repo path a phase block's `Decisions:` line admits to writing, and report a leftover on the `Checked:` line. Related: [[probe-guards-directly]].
