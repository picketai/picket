**Question:** How does Picket decide which lane my change request takes? Show me with a real request.
**Mode:** codebase · **Actor:** a user typing a change request in a Picket session · **Entry point:** `picket admit --request - --human`, run by the lead per `CLAUDE.md:7`

Captured on 2026-10-16 in the Picket repository with the repository build, so the code lines below match the output:

```
node dist/bin/picket.mjs admit --request - <<'PICKET_REQUEST_END'
Add a `picket close` verb to the kernel
PICKET_REQUEST_END
```

### Starting data

| Field | Value | Marker | From |
|---|---|---|---|
| request text | Add a `picket close` verb to the kernel | [ASSUMED] | chosen for this example, not a real request |
| forced lane line | none | [VERIFIED] | the request text above has no `lane:` line |
| fast-lane file cap | 3 | [VERIFIED] | `docs/skills.md:25` ("at most three files") |
| security paths | `src/auth/`, `src/crypto/`, `src/security/`, ... | [VERIFIED] | `src/lib/admit.mjs:89`, loaded from the project config |

### Walkthrough

1. **The lead hands the text to the kernel** at `src/bin/dispatch.mjs:99`
   In: the request on standard input · Rule: read the text, call `admit(text, { root, touched: [] })` [VERIFIED] (`src/bin/dispatch.mjs:105`) · Out: the same text, no touched files

2. **Quoted spans are blanked before looking for a forced lane** at `src/lib/admit.mjs:33`
   In: Add a `picket close` verb to the kernel · Rule: replace every backticked or quoted span with a space, then match `lane: <name>` [VERIFIED] (`src/lib/admit.mjs:30`, `src/lib/admit.mjs:31`) · Out: Add a   verb to the kernel; forced = null [VERIFIED] (`"forced":null` in the output)

3. **Paths named in the text are collected** at `src/lib/admit.mjs:38`
   In: the full text · Rule: a backticked span counts only when it has a file extension and exists on disk [VERIFIED] (`src/lib/admit.mjs:40`) · Out: `picket close` has no extension, so mentioned_paths = [] [VERIFIED] (`"mentioned_paths":[]`)

4. **Each signal is one regular expression over the text** at `src/lib/admit.mjs:97`
   In: the full text · Rule: research needs words such as "explain" or "how does" (`src/lib/admit.mjs:18`); new_surface needs "add a new command", "add an endpoint" and the like (`src/lib/admit.mjs:24`); small_change needs "fix", "rename", "typo" and the like (`src/lib/admit.mjs:26`) [VERIFIED] · Out: every signal false [VERIFIED] (output below)
   "Add a `picket close` verb" does not match new_surface: the pattern needs the surface word right after "add a" or "add a new", and "verb" is not in its word list. So "Add a new command `picket close`" would set new_surface, while "Add a `picket close` command" would not [INFERRED] from `src/lib/admit.mjs:24`.

5. **Heavy-lane and fast-lane checks both fail** at `src/lib/admit.mjs:116`
   In: research false, security, migration, irreversible and cross_context false · Rule: any heavy trigger answers design (`src/lib/admit.mjs:126`); fast needs a small-change word or a named file, with at most 3 files (`src/lib/admit.mjs:130`) [VERIFIED] · Out: no design reason; fastOk = false, because small_change is false and 0 files were named [INFERRED] from the rule and steps 3 and 4

6. **Order is the default** at `src/lib/admit.mjs:141`
   In: no reason collected so far · Rule: with no other reason, push the default reason and answer order [VERIFIED] · Out: lane order, printed to the user as `lane: order (no small-change word and no file named; order is the default)` [VERIFIED] (the same command with `--human`)

7. **The lead starts the lane skill admit named**, per `CLAUDE.md:7`
   In: lane order · Rule: order starts `picket:ordering` [VERIFIED] (`CLAUDE.md:7`) · Out: the order lane opens a work item and spawns the architect

### End state

| Field | Before | After | Marker | From |
|---|---|---|---|---|
| lane | (none) | order | [VERIFIED] | step 6, `"lane":"order"` |
| reasons | [] | no small-change word and no file named; order is the default | [VERIFIED] | step 6 |
| signals | (none) | all false, mentioned_paths [], security_path_hits [] | [VERIFIED] | step 4 |
| lane skill started | (none) | `picket:ordering` | [VERIFIED] | step 7 |

Full output of the command, `[VERIFIED]`:

```
{"lane":"order","reasons":["no small-change word and no file named; order is the default"],"signals":{"forced":null,"mentioned_paths":[],"touched":0,"declared_research":false,"research":false,"security":false,"security_path_hits":[],"migration":false,"irreversible":false,"new_dependency":false,"cross_context":false,"new_surface":false,"design_question":false,"small_change":false}}
```

### Not known

- Which `picket` build a user's PATH resolves to: the globally installed `picket admit` printed the same lane with a different reason ("not plainly small and not a heavy-lane trigger") and no `security_path_hits` field; its package version was not checked. The walkthrough uses the repository build only.

Next scenario on offer: "Add a new command `picket close` to the kernel", which step 4 predicts still lands in order but for a new-surface reason.
