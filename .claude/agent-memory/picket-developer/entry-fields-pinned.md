---
name: entry-fields-pinned
description: test/repo/agents.test.mjs pins each agent shell's ## Entry fields to what sendsFor sends; a new send line needs a fixture there
metadata:
  type: reference
---

`test/repo/agents.test.mjs` ("each shell outside PENDING names in ## Entry exactly the fields picket next sends it") builds sends from `ENTRY_FIXTURES` and compares their `key:` lines with the backticked fields in the shell's `## Entry`. Naming a new send line (such as `reword:`) in a shell fails `npm test` until an `ENTRY_FIXTURES` entry produces that send and the `sentKeys` list includes the key. That file is usually outside a phase's touch set. Name it on `Decisions:` because route commits it as "outside phase N's files".
