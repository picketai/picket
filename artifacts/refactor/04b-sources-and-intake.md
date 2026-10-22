# 04b: Sources and intake

Status: approved (2026-10-22).

`sources.mjs` splits by job into `shared/sources/`, the D-005 rule (single, identical, ambiguous, pin) becomes a pure function tested as data, the `open` verb drives intake so the work item model no longer imports sources, every failure becomes a refusal, and source names are checked against the shape pins already require. The code reads well today; this item separates what is mixed rather than rewriting it.

## Today

`core/lib/sources.mjs`, 411 lines, six jobs:

| Lines | Job | Used by |
|---|---|---|
| 22-108 | git discovery: `listWorktrees`, `localBranches`, `places`, `candidates`, `contentHash` | everything below |
| 110-153 | `find` and `grep` across every place | only the `source find` and `source grep` verbs |
| 156-237 | references in story text: `cleanToken`, `classify`, `extract`, `tokens` | intake, `source add` |
| 251-300 | the D-005 rule: `choose`, `resolveReferences` | intake, `source add` |
| 302-384 | `sources.yaml`, snapshots, `pick`, `addRef` | `new`, the `source` verbs, `next`, `packet` |
| 386-411 | drift between a snapshot and its live version | the review summary |

Beside it, `source-paths.mjs` (123 lines: what a source root protects, read without spawning git so hooks stay fast) and `repos.mjs` (72 lines: nested repositories and their recorded bases, which is not about sources at all).

What makes it harder to work with:

- **Two more git wrappers.** `git()` (`:22`) returns null on failure; `gitGrep()` (`:31`) treats exit 1 as "no match" and throws on anything else.
- **The rule cannot be tested without repositories.** `resolveReferences` calls `candidates`, which runs git. 21 of the 25 tests in `sources.test.mjs` call `tempSource()`, which builds a repository with a commit, a branch and a linked worktree; the file takes 13.4 s to run.
- **Four ways to fail, three exit codes.** `LookupError` carries `exitCode = 2`, read by nothing; `IntakeError` extends it; `pick` and `addRef` throw a plain `Error`. Results today: a pin that matches nothing exits 2, an unknown pick label exits 1 (a crash), an invalid `grep` regex exits 1 (a crash), an undeclared source exits 1, an unreachable one exits 2.
- **The work item model depends on sources.** `createWork` (`work.mjs:115`) resolves the story's references through `storyIntake`, so `work.mjs` imports `sources.mjs`. Folders arrive as `dir`, not `(root, id)`.
- **Source names are never checked.** `checkSourceDeclarations` (`config.mjs`) accepts any key, but a pin only matches `[A-Za-z0-9_-]+` (`PIN`, `:159`): a source named `my.docs` can be declared and searched, never pinned. The name is also a folder in `work/<id>/sources/<name>/<path>`.
- **Hidden process reads.** `source-paths.mjs` reads `process.platform` at load time and `process.env` as a default parameter.
- **Shapes live in JSDoc.** `@returns {Array<{ ref: string, source: string|null, ... }>}`, which the comments rule deletes on conversion (K-14).

## Target

```
src/lib/shared/sources/
  places.mts       Place, Candidate; listWorktrees, localBranches, places, candidates, contentHash
  references.mts   Reference; extractReferences(text) -> { refs, unshaped }               pure
  resolve.mts      Lookup; resolveReferences(text, sources, lookup) -> Resolution          pure, D-005
  intake.mts       readIntake, writeIntake, ambiguousRefs, snapshotPath (work item files)
  drift.mts        liveDrift(root, id, sources)
  protection.mts   canonicalPath, enclosingRepo, protectionScope, sourceRoots(root, env, platform), underSource
src/lib/shared/repos.mts       nested repositories and bases, moved out unchanged
src/lib/verbs/source/
  index.mts        the group verb: find, grep, pick, add
  find.mts  grep.mts           the search code, used by nothing else
  pick.mts  add.mts            actions that refuse instead of throwing
src/lib/verbs/open/index.mts   resolves the story, opens the item, writes the intake
```

### The rule as a pure function

Discovery runs git; the rule only chooses. The rule receives a `Lookup` that answers two questions: the candidates for a path, and the labels of a source's places (for messages such as `searched main, feat-x, old`).

```ts
// src/lib/shared/sources/resolve.mts
export type Lookup = {
  candidates: (source: Source, path: string) => Candidate[];
  labels: (source: Source) => string[];
};

export type ResolvedRef = {
  status: "resolved"; ref: string; source: SourceName; path: string; anchor?: string;
  chosen_by: "single" | "identical" | "pin" | "user";
  worktree: string | null; branch: string | null; commit: string | null; sha256: string; dirty: boolean;
  snapshot: string | null; snapshot_reason?: string;
};
export type AmbiguousRef = { status: "ambiguous"; ref: string; source: SourceName; path: string; candidates: string[] };
export type Resolution = { refs: (ResolvedRef | AmbiguousRef)[]; unmatched: string[]; failures: string[]; bytes: Map<string, Uint8Array> };

export function resolveReferences(text: string, sources: Source[], lookup: Lookup): Resolution
```

```ts
// src/lib/shared/sources/places.mts
export function liveLookup(sources: Source[]): Lookup {
  const placesOf = memo((source: Source) => places(source.root));
  return {
    candidates: (source, path) => candidates(source, path, placesOf(source)),
    labels: (source) => placesOf(source).map((p) => p.label),
  };
}
```

A rule test is data:

```ts
test("two worktrees with the same bytes resolve to the main one", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true }), candidate("feature/x", "aaa")] } });
  const { refs } = resolveReferences("see docs/fees.md", [analysis], lookup);
  assert.deepEqual(only(refs[0], "status", "chosen_by", "branch"), { status: "resolved", chosen_by: "identical", branch: "main" });
});
```

Real-git tests stay where git is what is tested: worktree and branch listing, CRLF hashing, a working-copy edit marked `dirty`, drift after an edit or a removed worktree, `sourceRoots` from a linked worktree, snapshot bytes ignored by git. `places` is computed once per action through `liveLookup`, where today `pick` and `addRef` recompute it.

### `open` drives intake

```ts
// src/lib/verbs/open/index.mts
export const open = action<OpenInput, OpenResult>(async (input, { root, now, session }) => {
  const { sources } = loadConfig(root);
  const resolution = input.story === null ? null : resolveReferences(input.story, sources, liveLookup(sources));
  if (resolution?.failures.length) return refuse("source references not found", { failures: resolution.failures });
  const state = createItem(root, { lane: input.lane, title: input.title, request: input.request, story: input.storyBytes, session, now });
  if (resolution) writeIntake(root, state.id, resolution);
  recordBases(root, state.id);
  return done({ ...state, dir: workRel(state.id), warnings: snapshotWarnings(input, sources), next: nextView(...) });
});
```

`createItem` lives in `shared/work/state.mts` and imports nothing from sources. The refusal keeps today's `failures` field, inside `{ ok: false, error, failures }`.

### Failures

| Case | Today | Target |
|---|---|---|
| a pin that matches nothing (`open`, `source add`) | `IntakeError` / `LookupError`, exit 2 | `refuse(..., { failures })`, exit 2 |
| a document with differing versions (`source add`) | `LookupError`, exit 2 | `refuse(..., { ref, candidates })`, exit 2 |
| unknown label (`source pick`) | plain `Error`, exit 1 | `refuse(..., { ref, labels })`, exit 2 |
| reference already resolved (`source pick`) | plain `Error`, exit 1 | `refuse(..., { ref, chosen_by })`, exit 2 |
| invalid regex (`source grep`) | `Error("git grep failed: ...")`, exit 1 | `refuse("git grep failed: ...")`, exit 2 |
| undeclared source name | `Error`, exit 1 | `refuse(..., { declared })`, exit 2 |
| unreachable source | printed `{ source, error }`, exit 2 | `refuse(..., { source })`, exit 2 |

`LookupError` and `IntakeError` are deleted. The tests that assert exit 1 for the three cases above change to 2.

### Git and the process

- `util/git.mts` gains `gitRead(root, args, { buffer: true })` for blob bytes and `gitRun(root, args, { okExitCodes: [0, 1] })` for `git grep`, so "exit 1 means no match" is stated where it is used.
- `protection.mts` takes `env` and `platform` as arguments; the guard (item 05) and `preflight` (04c) pass them from the `Context` (C-007).

### Source names

```ts
// src/lib/shared/config.mts
const SOURCE_NAME = /^[A-Za-z0-9_-]+$/;
// in checkSourceDeclarations: a key that fails the shape is left out, with
// warn(`source "${name}" ignored: a source name may use letters, digits, "_" and "-"`)
```

The `PIN` pattern in `references.mts` reuses `SOURCE_NAME`, so the two cannot drift. The example in `docs/how-to.md:231` (`specs`) and this repository's `analysis` both pass.

## Evidence (2026-10-22)

- `node --test test/kernel/sources.test.mjs`: 25 tests pass in 13 382 ms. 21 of them call `tempSource()`, which runs `git init`, `commit`, `branch` and `worktree add`.
- Exit codes today, from the tests: unknown pick label `assert.equal(unknown.code, 1)`; invalid regex `assert.equal(r.code, 1)` with `/git grep failed/` on stderr; undeclared source `assert.equal(undeclared.code, 1)`; unset root `assert.equal(unset.code, 2)`; unmatched pin `assert.equal(r.code, 2)`.
- `PIN = /^([A-Za-z0-9_-]+)@([A-Za-z0-9_./-]+):(.+)$/` (`sources.mjs:159`) against `checkSourceDeclarations`, which returns the object as given.
- Call sites outside `sources.mjs`: `next.mjs:31` and `packet.mjs:191` (`ambiguousRefs`, which 04a moves into the snapshot), `packet.mjs:134` (`candidates`, for the gate packet lines), `review.mjs:190` (`liveDrift`), `work.mjs:138` (`resolveReferences`), `preflight.mjs:107` (`protectionScope`), `guard.bash.mjs:1097-1130` and `guard.scope.mjs:66` (`sourceRoots`, `underSource`).

## Decisions

### S-1: `shared/sources/` split by job
`places`, `references`, `resolve`, `intake`, `drift`, `protection`. `repos.mts` moves to `shared/` unchanged, since it is about nested repositories, not sources.

### S-2: Search lives in the verb
`find` and `grep` move into `verbs/source/find.mts` and `grep.mts`; nothing else searches (C-014).

### S-3: The D-005 rule is pure
`resolveReferences` takes a `Lookup` with `candidates` and `labels`; rule tests are data; real-git tests stay for discovery, hashing, drift, protection and snapshots.

### S-4: `open` drives intake
`shared/work/state.mts` imports nothing from sources; the verb resolves, refuses on failures, opens the item, writes the intake and records the bases.

### S-5: Every failure is a refusal
Exit 2 with details, per the table above; `LookupError` and `IntakeError` go. Three cases move from exit 1 to exit 2.

### S-6: Typed records
`Place`, `Candidate`, `Reference`, `ResolvedRef`, `AmbiguousRef`, `Resolution`, `Drift` replace the JSDoc shapes. `ambiguousRefs` returns `AmbiguousRef[]`.

### S-7: Git through `util/git.mts`
With the `buffer` and `okExitCodes` options; `places` computed once per action.

### S-8: `protection.mts` takes `env` and `platform`
No module-level `process.platform`, no `process.env` default.

### S-9: Source names match `^[A-Za-z0-9_-]+$`
A name that fails is left out with a warning; `PIN` reuses the same pattern. Approved by the user on 2026-10-22.

### S-10: The verb that opens a work item is `open`
`picket new` becomes `picket open`, pairing with `close`; `extension new` becomes `extension add`, matching `source add`. Under the naming rule the user chose on 2026-10-22: a verb that changes something is an action word, a verb that only prints may be named after what it shows (`state`, `next`, `cost`, `summary`, `packet`, `statusline`), and a group is a noun followed by an action.

## Migration

One phase, after 04a (the snapshot carries `ambiguousRefs`).

- `shared/sources/places.mts`, `references.mts`, `resolve.mts`, `intake.mts`, `drift.mts`, `protection.mts`; `shared/repos.mts`.
- Rule tests as data for: single, identical with main preferred, identical without a main, ambiguous, pin found, pin on the wrong branch, unreachable pinned source, unshaped path to `unmatched`, the 200-reference cap.
- `sources.test.mjs` keeps its real-git tests for the cases listed in S-3 and drops the ones the data tests now cover; target under 5 s for the file.
- `verbs/source/` with `find`, `grep`, `pick`, `add`; `verbs/open/`; the three exit-code assertions change to 2.
- `config.mts` checks source names; a test with `my.docs` declared expects the warning and no such source.
- The renames: `picket new` to `picket open` in `core/skills/{designing/steps/10-design.md,expediting/SKILL.md,ordering/steps/10-order.md,researching/steps/10-outline.md}`, `guard.scope`, `test/hooks/handlers.test.mjs`, `test/kernel/work.test.mjs`; `extension new` to `extension add` in `docs/how-to.md` and its tests.

## Risks

- R-1: `open` is also a word the guard may see in other commands (`open file.txt` on macOS). The guard matches `picket <verb>` as a pair, never the bare word; item 05 keeps it that way.
- R-2: dropping repository tests could lose a case the data tests miss. Each dropped test names the data test that replaces it in the commit message.
- R-3: a project with a dotted source name loses that source until it is renamed; the warning says how. The release note lists it.
- R-4: exit 1 to exit 2 for three source failures; no skill reads these exit codes (checked for `source pick`, `source grep` and `source find` in `core/skills`).

## Affects

- 02: K-10 gains the naming rule and two renames.
- 03: X-8's rename table gains `new` to `open` and `extension new` to `extension add`; the verb tree gets `open/` instead of `new/`.
- 04a: `ambiguousRefs` feeds `WorkSnapshot.ambiguousRefs`; `createItem` replaces `createWork` in `shared/work/state.mts`.
- 04c: `preflight` calls `protectionScope` with `env` and `platform`.
- 04d: the review summary calls `liveDrift(root, id, sources)`; the packet's candidate lines use `candidates` through `liveLookup`.
- 05: the guard calls `sourceRoots(root, env, platform)`.

## Open questions

None.
