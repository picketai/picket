---
name: glob-tokens-dropped-by-split
description: shell-quote parses an unquoted glob as {op:"glob"}; splitIntoSegments drops it from segments and pushes null as a redirect target
metadata:
  type: project
---

In guard.bash, `parse()` (src/lib/util/vendor/shell-quote-parse.mjs) turns an unquoted `appr*` into `{op: "glob", pattern}`. `splitIntoSegments` (bash.mts) handles it like an operator. The word never reaches the segment, and a glob redirect target is recorded as `null`. Also, without `markVariable`, `parse` replaces `$PWD` with an empty string.

**Why:** in the 20261119 records fix, a check over segment words never saw `cp a .picket/state/data/appr*` until the glob tokens were mapped back to their pattern strings before the split.

**How to apply:** before a guard reads paths from parsed tokens, map the glob objects to strings and parse with `markVariable` if it must see expansions.
