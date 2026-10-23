---
kind: design
lane: design
title: Refactor item 04b, sources and intake
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/04b-sources-and-intake.md, artifacts/refactor/00-conventions.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/04d-reading-and-reporting.md, artifacts/refactor/05-hooks.md, artifacts/refactor/06-tests.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-04a-work-item-model/design.md, tsconfig.json, package.json, src/lib/shared/sources/sources.mjs, src/lib/shared/sources/source-paths.mjs, src/lib/shared/repos.mjs, src/lib/shared/config.mjs, src/lib/shared/config.schema.json, src/lib/shared/action.mts, src/lib/shared/context.mts, src/lib/shared/git.mts, src/lib/util/git.mts, src/lib/util/process.mts, src/lib/shared/work/state.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/files.mts, src/lib/verbs/source (every file), src/lib/verbs/open/index.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/preflight/preflight.mjs, src/lib/shared/review-summary.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/guard.scope.mjs, src/hooks/README.md, test/kernel/sources.test.mjs, test/kernel/config.test.mjs, test/kernel/git.test.mjs, test/kernel/review.test.mjs, test/kernel/work-fixture.mjs, test/kernel/conventions.test.mjs, test/kernel/kernel-sources.mjs, test/hooks/handlers.test.mjs, timed run of sources.test.mjs (2026-10-23)]
phases:
  - n: 1
    files: [src/lib/shared/sources/source.mts, src/lib/shared/sources/references.mts, src/lib/shared/sources/sources.mjs, src/lib/shared/config.mjs, src/lib/shared/config.schema.json, src/lib/verbs/source/reachable.mts, test/kernel/config.test.mjs, test/kernel/references.test.mjs, test/kernel/sources.test.mjs]
    greps:
      - path: src/lib/shared/sources/source.mts
        pattern: 'export const SOURCE_NAME_CHARS\b'
      - path: src/lib/shared/sources/source.mts
        pattern: 'export function isSourceName\(name: string\): boolean'
      - path: src/lib/shared/sources/references.mts
        pattern: 'export function extractReferences\(text: string\): ExtractedReferences'
      - path: src/lib/shared/sources/references.mts
        pattern: 'SOURCE_NAME_CHARS'
      - path: src/lib/shared/config.mjs
        pattern: 'ignored: a source name may use letters, digits'
      - path: src/lib/shared/config.schema.json
        pattern: '"propertyNames"'
      - path: src/lib/shared/sources/sources.mjs
        pattern: '^(?![\s\S]*(function classify|function cleanToken|const PIN\b|export function tokens))'
        flags: i
      - path: test/kernel/references.test.mjs
        pattern: 'my\.docs@main:a\.md'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/util/git.mts, src/lib/shared/sources/places.mts, src/lib/shared/sources/resolve.mts, src/lib/shared/sources/sources.mjs, src/lib/shared/work/state.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/preflight/preflight.mjs, test/kernel/git.test.mjs, test/kernel/lookup-fixture.mjs, test/kernel/resolve.test.mjs, test/kernel/sources.test.mjs]
    greps:
      - path: src/lib/shared/sources/resolve.mts
        pattern: 'export function resolveReferences\(text: string, sources: readonly Source\[\], lookup: Lookup\): Resolution'
      - path: src/lib/shared/sources/resolve.mts
        pattern: '^(?![\s\S]*(node:fs|node:child_process|util/git))'
        flags: i
      - path: src/lib/shared/sources/places.mts
        pattern: 'export function liveLookup\(\): Lookup'
      - path: src/lib/shared/sources/places.mts
        pattern: 'export function candidates\(source: ReachableSource, path: string, where: readonly Place\[\]\): Candidate\[\]'
      - path: src/lib/util/git.mts
        pattern: 'buffer: true'
      - path: src/lib/shared/sources/sources.mjs
        pattern: '^(?![\s\S]*(function git\(|export function listWorktrees|export function candidates|function choose|export function resolveReferences))'
        flags: i
      - path: test/kernel/resolve.test.mjs
        pattern: 'lookupOf\('
      - path: test/kernel/resolve.test.mjs
        pattern: '^(?![\s\S]*(node:child_process|mkdtemp))'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/sources/intake.mts, src/lib/shared/sources/drift.mts, src/lib/shared/repos.mts, src/lib/shared/sources/sources.mjs, src/lib/shared/work/state.mts, src/lib/shared/work/snapshot.mts, src/lib/verbs/open/index.mts, src/lib/verbs/source/pick.mts, src/lib/verbs/source/add.mts, src/lib/shared/review-summary.mjs, test/kernel/intake.test.mjs, test/kernel/work-fixture.mjs, test/kernel/review.test.mjs]
    greps:
      - path: src/lib/shared/work/state.mts
        pattern: 'export function createItem\(root: string, item: NewItem, now: Date\): WorkState'
      - path: src/lib/shared/work/state.mts
        pattern: '^(?![\s\S]*(sources/|repos\.m|config\.m|createWork))'
        flags: i
      - path: src/lib/shared/sources/intake.mts
        pattern: 'export function ambiguousRefs\(root: string, id: WorkId\): AmbiguousRef\[\]'
      - path: src/lib/shared/sources/drift.mts
        pattern: 'export function liveDrift\(root: string, id: WorkId, sources: readonly Source\[\]\): Drift\[\]'
      - path: src/lib/shared/repos.mts
        pattern: 'export function recordBases\(root: string, id: WorkId\)'
      - path: src/lib/verbs/open/index.mts
        pattern: 'resolveReferences\('
      - path: src/lib/verbs/open/index.mts
        pattern: 'recordBases\(root'
      - path: src/lib/shared/work/snapshot.mts
        pattern: 'from "\.\./sources/intake\.mts"'
      - path: src/lib/shared/sources/sources.mjs
        pattern: '^(?![\s\S]*(IntakeError|export function liveDrift|export function writeIntake|export function readIntake|export function ambiguousRefs))'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/util/git.mts, src/lib/verbs/source/reachable.mts, src/lib/verbs/source/find.mts, src/lib/verbs/source/grep.mts, src/lib/verbs/source/pick.mts, src/lib/verbs/source/add.mts, test/kernel/git.test.mjs, test/kernel/sources.test.mjs]
    greps:
      - path: src/lib/util/git.mts
        pattern: 'export class GitFailed extends Error'
      - path: src/lib/verbs/source/grep.mts
        pattern: 'okExitCodes: \[0, 1\]'
      - path: src/lib/verbs/source/grep.mts
        pattern: 'GitFailed'
      - path: src/lib/verbs/source/reachable.mts
        pattern: 'declared'
      - path: src/lib/verbs/source/add.mts
        pattern: '^(?![\s\S]*(LookupError|sources/sources))'
        flags: i
      - path: src/lib/verbs/source/pick.mts
        pattern: '^(?![\s\S]*(sources/sources|throw new Error))'
        flags: i
      - path: src/lib/verbs/source/find.mts
        pattern: '^(?![\s\S]*node:child_process)'
        flags: i
      - path: test/kernel/sources.test.mjs
        pattern: 'undeclared\.code, 2\)'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/shared/sources/protection.mts, src/lib/hooks/guard.bash.mjs, src/lib/hooks/guard.scope.mjs, src/lib/verbs/preflight/preflight.mjs, src/hooks/README.md, test/kernel/sources.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: src/lib/shared/sources/protection.mts
        pattern: 'export function sourceRoots\(projectRoot: string, env: NodeJS.ProcessEnv, platform: Platform\): SourceRoot\[\]'
      - path: src/lib/shared/sources/protection.mts
        pattern: '^(?![\s\S]*(process\.platform|process\.env))'
        flags: i
      - path: src/lib/hooks/guard.bash.mjs
        pattern: 'sourceRoots\(root, process\.env, process\.platform\)'
      - path: src/lib/hooks/guard.bash.mjs
        pattern: '^(?![\s\S]*underSource\(.*, roots\))'
        flags: i
      - path: src/lib/hooks/guard.scope.mjs
        pattern: 'sourceRoots\(root, process\.env, process\.platform\)'
      - path: src/lib/verbs/preflight/preflight.mjs
        pattern: 'protectionScope\(source\.root, root, process\.platform\)'
      - path: src/hooks/README.md
        pattern: 'src/lib/shared/sources/protection\.mts'
      - path: test/hooks/handlers.test.mjs
        pattern: 'shared/sources/protection\.mts'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [test/kernel/sources.test.mjs, test/kernel/resolve.test.mjs, test/kernel/intake.test.mjs]
    greps:
      - path: test/kernel/sources.test.mjs
        pattern: '^(?![\s\S]*(resolves single, and the snapshot is its bytes|CRLF in the main worktree and LF on a branch|ordinary words stay plain text|a #fragment and a markdown link target))'
        flags: i
      - path: test/kernel/sources.test.mjs
        pattern: 'a removed linked worktree reports live_sha256 null'
    tests: true
    drive: false
    security: false
---
# Design: Refactor item 04b, sources and intake

## Problem

`sources.mjs` (411 lines) mixes six jobs: git discovery, search, story references, the D-005 rule, the intake files and drift. The rule cannot be tested without repositories (21 of 25 tests in `sources.test.mjs` build one; the file took 19.1 s on 2026-10-23), the work item model imports sources to open an item, four error kinds map to three exit codes, a source named `my.docs` can be declared but never pinned, and `source-paths.mjs` reads `process.platform` and `process.env` itself. The user approved item 04b (`artifacts/refactor/04b-sources-and-intake.md`: S-1 to S-10, its migration, risks and "Affects") and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases and re-decides none. Binding constraints: items 01 to 04a are done, so the real paths are `src/lib/shared/sources/`, `src/lib/verbs/source/{find,grep,pick,add,reachable}.mts` and `src/lib/verbs/open/index.mts` (item 03 D-002, D-004, D-005), and `WorkSnapshot.ambiguousRefs` already exists (item 04a D-002); S-10's renames (`new` to `open`, `extension new` to `extension add`) landed in item 03 D-008 (commit bd52c14), so nothing of S-10 is left; every phase leaves `npm test` green and the CLI working, because this session runs the harness from `dist/`; a phase's `files` name only paths that exist afterwards, and deletions go on the block's Files line.

## Decisions

### D-001: `shared/sources/` split by job, with typed records
**Decision:** Infrastructural decision, carrying S-1, S-6, C-002, C-003, C-010, C-011 and C-014. `sources.mjs` and `source-paths.mjs` give way to seven `.mts` files under `src/lib/shared/sources/`: `source.mts`, `references.mts`, `resolve.mts`, `places.mts`, `intake.mts`, `drift.mts`, `protection.mts`. `source.mts` is one file more than the draft lists. It holds `SOURCE_NAME_CHARS` (`"[A-Za-z0-9_-]+"`), `SOURCE_NAME`, `isSourceName(name)`, `Source = { name: string; env: string | null; root: string | null; reason: string | null }` (what `config.mjs:178` builds), `ReachableSource = Source & { root: string }` and `isReachable(source)`. The draft puts `SOURCE_NAME` in `config.mts`, but `config.mjs` stays `.mjs` here (see Instead of), and the pure `references.mts` must not import a module that reads files; so the pattern and the declared-source type live in this leaf, which `config.mjs` imports as `./sources/source.mjs`. The adapters' own copies of `Source` (`verbs/source/reachable.mts:5`, `verbs/open/index.mts:24`) go. The records: `Worktree`, `Branch`, `Place`, `Candidate` (`places.mts`); `Reference`, `ExtractedReferences` (`references.mts`); `ResolvedRef`, `AmbiguousRef`, `Resolution` (`resolve.mts`); `IntakeRecord` (`intake.mts`); `Drift` (`drift.mts`); `ProtectionScope`, `SourceRoot` (`protection.mts`). `ambiguousRefs` returns `AmbiguousRef[]`, and `snapshot.mts` drops its looser copy (`snapshot.mts:10`). `repos.mjs` converts in place to `shared/repos.mts`, root first: `nestedRepos(root)`, `recordBases(root, id)`, `readBases(root, id)`, its file through `workFile(root, id, "repos.yaml")`. A record written to `sources.yaml` keeps today's key order: `ref, source, path, status, chosen_by, worktree, branch, commit, sha256, dirty, snapshot`, then `snapshot_reason` and `anchor` when set (`sources.mjs:252-253`, `:310`); an ambiguous one `ref, source, path, status, candidates` (`:267`).
**Instead of:** converting `config.mjs` to `config.mts` now so `SOURCE_NAME` sits where the draft put it: its `env = process.env` default would fail the process-read scan (`conventions.test.mjs:10`), and removing that default changes every `.mjs` caller of `loadConfig`, which items 04c and 04d convert.
**Risks:**
- **RISK-001** A record's keys change order and every committed `sources.yaml` diffs on its next write. Mitigation: `intake.test.mjs` asserts the key order of both record kinds.
- **RISK-002** An `.mjs` caller gets the `(dir)` to `(root, id)` flip wrong without a type check (`checkJs: false`). Mitigation: each phase lists every caller; `packet.mjs` and `review-summary.mjs` run in `sources.test.mjs` T-4.3, T-5.3, T-5.4 and `review.test.mjs`.

### D-002: The D-005 rule is a pure domain service over an injected `Lookup`
**Decision:** Carrying S-3 and S-7's "`places` computed once per action". The rule is a domain service; `Lookup` is its port and `liveLookup` the git adapter. `resolve.mts` exports `Lookup = { candidates: (source: ReachableSource, path: string) => Candidate[]; labels: (source: ReachableSource) => string[] }`; `ResolvedRef` and `AmbiguousRef` as the draft shows them, with `anchor?`, `snapshot_reason?` and `commit: string | null`; `Resolution = { refs: (ResolvedRef | AmbiguousRef)[]; unmatched: string[]; failures: string[]; bytes: Map<string, Uint8Array> }`; `resolvedRef(reference, sourceName, candidate, chosenBy): ResolvedRef`; and `resolveReferences(text, sources, lookup): Resolution`, the logic of `sources.mjs:251-300` in the same order with the same messages (`searched main, feat-x, old` comes from `lookup.labels`). It imports only `references.mts`, `source.mts` and types from `places.mts`: no `node:fs`, no git. `places.mts` exports `liveLookup(): Lookup`, which keeps `places(root)` per source root for the life of the lookup, so one action lists each source's places once (today `addRef` lists them in `resolveReferences` and again for its "not found" message). The draft's `liveLookup(sources)` parameter is dropped because the memo needs none.
**Instead of:** stubbing `execFileSync` in the rule tests: git argument lists would sit in the rule's tests, so every change to discovery would break them.
**Risks:**
- **RISK-003** The data fixture's candidates differ from what `candidates` returns live (order, `main`), so the rule passes its tests and fails in use. Mitigation: the real-git tests of listing and candidates stay (D-008), and the CLI tests T-4.3 and T-4.4 keep running the rule through `liveLookup`.

### D-003: `open` drives intake; the work item model imports nothing from sources
**Decision:** Carrying S-4 and the 04a draft's "Affects" line. Opening an item is an application service in the verb. `state.mts`: `createWork` becomes `createItem(root, item: NewItem, now): WorkState`, which checks the lane, the id and that the item is new, then writes `state.yaml`, `phases/`, `request.md` and `story.md`; it no longer imports `config.mjs`, `repos` or anything under `sources/`. `verbs/open/index.mts`: read the request and story; when there is a story and a reachable source, `resolveReferences(story, sources, liveLookup())`; on failures return `refuse` with today's message (`source references not found:` and one `- <failure>` line each) and `{ failures }` before anything is written; then `createItem`, `writeIntake(root, id, resolution)`, `recordBases(root, id)`, the no-source warning, and `readNext`. `snapshot.mts` reads `ambiguousRefs(root, id)` from `intake.mts`. `IntakeError` goes.
**Instead of:** `createItem` taking an optional `Resolution` and writing the intake: the model would again know the intake files, which S-4 moves out of it.
**Risks:**
- **RISK-004** A caller that relied on `createWork` recording bases loses `repos.yaml`. Mitigation: `work-fixture.mjs`'s `createWork` calls `createItem` then `recordBases`, as `open` does; `review.test.mjs` T-1.2 passes.
- **RISK-005** With an existing `--id` and a failing pin, `open` now refuses on the pin instead of "already exists". Mitigation: none needed; both write nothing and exit nonzero.

### D-004: Search, pick and add live in the source verbs, and every failure is a refusal
**Decision:** Infrastructural decision, carrying S-2, S-5, C-008 and C-014. `verbs/source/find.mts` holds `findPaths(source, needle)` and `grep.mts` holds `grepHits(source, regex, { path })`, the code of `sources.mjs:110-152`; `reachable.mts` gains `HIT_CAP` and `capped`, which both use. `pick.mts` and `add.mts` hold today's `pick` and `addRef` as action bodies over `readIntake`, `writeRecord`, `snapshotInto` and `resolvedRef`, each with one `liveLookup()`. The refusals, all exit 2 with `{ ok: false, error, ... }`: a pin that matches nothing (`open`, `source add`) `{ failures }`; a document with differing versions (`add`) `{ ref, candidates }`; not found (`add`) `{ ref }`; not a path reference (`add`, `sources.mjs:369`) `{ ref }`; unknown label (`pick`) `{ ref, labels }`; already resolved (`pick`) `{ ref, chosen_by }`; a ref not in the record (`pick`) `{ ref }`; invalid regex (`grep`) `{ source }` with `git grep failed: ...`; undeclared source (`find`, `grep`) `{ declared }`; unreachable source `{ source }`. "Not a path reference" and "a ref not in the record" are not in the draft's table; they become refusals because the request says every failure. `LookupError`, `IntakeError` and `sources.mjs` are deleted. Three assertions in `sources.test.mjs` change from exit 1 to 2 (unknown label `:222`, invalid regex `:301`, undeclared `:113`), their stderr matches moving to the JSON `error`.
**Instead of:** keeping `pick` and `addRef` in `shared/sources/` with thin adapters: nothing else calls them, and C-014 keeps verb-only code in its verb folder.
**Risks:**
- **RISK-006** A skill or script reads exit 1 or stderr from these verbs (draft R-4). Mitigation: phase 4 greps `src/skills` and `scripts` for `source pick`, `source grep`, `source find` and `source add` and lists any reader in the block.

### D-005: Git through `util/git.mts`
**Decision:** Infrastructural decision, carrying S-7 and C-010. `gitRead(root, args, { maxBuffer, buffer: true })` returns the exact bytes as a `Buffer` (no `trimEnd`), or `null`, through an overload; the string form is unchanged. `gitRun(root, args, { input, env, maxBuffer, okExitCodes })` returns stdout when the exit code is in `okExitCodes` (exit 1 of `git grep` gives `""`), and otherwise throws `GitFailed`, a new `Error` subclass whose message stays `git <subcommand> failed: <last stderr line>`. `grep.mts` turns `GitFailed` into a refusal. `sources.mjs`'s `git()` and `gitGrep()` go; no file under `shared/sources/` or `verbs/source/` imports `node:child_process`. `SOURCE_MAX_BUFFER` (64 MiB, today's value) lives in `places.mts`.
**Instead of:** a `gitGrep` helper in `util/git.mts`: the "exit 1 is no match" rule would hide in a name instead of being stated at the call.
**Risks:**
- **RISK-007** Existing callers of `gitRun` catch by class or message. Mitigation: `GitFailed` extends `Error` with the same message; `git.test.mjs` T-1.5 passes unchanged.

### D-006: `protection.mts` takes `env` and `platform`
**Decision:** Infrastructural decision, carrying S-8 and C-007. `source-paths.mjs` moves to `protection.mts`: `Platform = NodeJS.Platform`; `canonicalPath(p, platform)`, `enclosingRepo(dir)`, `protectionScope(sourceRoot, projectRoot, platform): ProtectionScope`, `sourceRoots(projectRoot, env, platform): SourceRoot[]`, `underSource(absPath, roots, platform)`. No module-level `process.platform`, no `process.env` default; it still reads only the filesystem, never git, so the guards stay inside the hook budget. The hook handlers `guard.bash.mjs` and `guard.scope.mjs` are entry points and pass `process.env` and `process.platform` until item 05 gives them a `Context` (05 in the draft's "Affects"); `preflight.mjs` passes `process.platform`, which it already reads (`preflight.mjs:34`), until item 04c.
**Instead of:** storing the platform on each `SourceRoot` so `underSource` takes no third argument: the platform belongs to the process, not to a source, and the guards call `underSource` from only four places.
**Risks:**
- **RISK-008** A guard call site misses the platform, so on Windows a write into a source compares paths case-sensitively and passes. Mitigation: phase 5 greps each guard call; the protection tests in `sources.test.mjs` and the source-denial cases in `handlers.test.mjs` run on this Windows machine.

### D-007: Source names match `^[A-Za-z0-9_-]+$`
**Decision:** Infrastructural decision, carrying S-9 (approved by the user on 2026-10-22). `checkSourceDeclarations` (`config.mjs:66`) keeps a key only when `isSourceName(key)`; any other key is left out with `warn(\`source "${name}" ignored: a source name may use letters, digits, "_" and "-"\`)`. `config.schema.json` gives `sources` a `propertyNames` pattern of the same text. `references.mts` builds its pin pattern from `SOURCE_NAME_CHARS`, so the two cannot drift. This repository's `analysis` and the how-to's `specs` pass.
**Instead of:** accepting any name and escaping it in pins and snapshot folders: the name is a path segment in `work/<id>/sources/<name>/`, and an escape rule is a second format to keep.
**Risks:**
- **RISK-009** A project with a dotted source name loses that source (draft R-3). Mitigation: the warning says which characters are allowed; the release note is the release's.

### D-008: Rule tests are data; repository tests keep what git decides
**Decision:** Infrastructural decision, carrying S-3's tests, the draft's migration, R-2, and item 04a D-008's approach that integration suites keep their bodies while code moves. Tests stay in `test/kernel/` and import `dist/` until item 06 moves them beside the code (`06-tests.md:33`). New: `lookup-fixture.mjs` (`lookupOf(table)`, `candidate(label, sha256, options)`, `only(record, ...keys)`), `resolve.test.mjs` with the draft's nine cases, `references.test.mjs` (the token cases, through `extractReferences`), `intake.test.mjs` (a temp folder, no git: key order, the 1 MiB cap, `ambiguousRefs`). Through phases 1 to 5 `sources.test.mjs` changes only import lines, call shapes and phase 4's three exit codes; phase 6 drops the four tests a data test now covers and names each replacement.
**Instead of:** trimming `sources.test.mjs` as each module moves: those tests are the proof that the moves kept behaviour, and trimming before the last move weakens that proof.
**Risks:**
- **RISK-010** A dropped repository test held a case the data tests miss (draft R-2). Mitigation: the block names, for each dropped test, the data tests that replace it.
- **RISK-011** The draft's "under 5 s" target is out of reach with 17 repository and CLI tests left (OQ-001). Mitigation: phase 6's criteria count and time instead.

## Scope

**In:**
- `shared/sources/` as `source`, `references`, `resolve`, `places`, `intake`, `drift`, `protection` (`.mts`); `sources.mjs` and `source-paths.mjs` deleted; `repos.mjs` converted to `repos.mts`, root first (D-001).
- The rule over a `Lookup`, `liveLookup`, and the data tests (D-002, D-008).
- `createItem` and `open` driving intake; `snapshot.mts` on `intake.mts` (D-003).
- Search, `pick` and `add` in the source verbs; every failure a refusal (D-004).
- `gitRead` with `buffer`, `gitRun` with `okExitCodes` and `maxBuffer`, `GitFailed` (D-005).
- `protection.mts` with `env` and `platform`, its callers repointed (D-006).
- The source name check, the schema pattern and the pin pattern on it (D-007).

**Out:**
- `config.mjs` converted to `.mts` or losing its `process.env` default (04c, 04d).
- `preflight` and the guards taking `env` and `platform` from a `Context` (04c, 05); `packet` and the review summary converted (04d); this item only repoints their imports and calls.
- Tests beside their code and `#test/` helpers (06); the release note for dotted names (draft R-3).
- S-10's renames, done in item 03.

## Phase 1: Source names and references

**Touch set:**
- `src/lib/shared/sources/source.mts`: new; name pattern, `Source` types (D-001, D-007)
- `src/lib/shared/sources/references.mts`: new; `sources.mjs:156-236` moved, typed
- `src/lib/shared/sources/sources.mjs`: imports `extractReferences`, `hasExtension`
- `src/lib/shared/config.mjs`: `checkSourceDeclarations` filters names
- `src/lib/shared/config.schema.json`: `sources.propertyNames`
- `src/lib/verbs/source/reachable.mts`: `Source` from `source.mts`
- `test/kernel/config.test.mjs`: the `my.docs` case
- `test/kernel/references.test.mjs`: new; the token cases
- `test/kernel/sources.test.mjs`: token assertions leave; imports

**Changes:** `source.mts` as D-001 lists it; `SOURCE_NAME` is `^` + `SOURCE_NAME_CHARS` + `$`. `references.mts` exports `TOKEN_CAP`, `Reference = { ref: string; source: string | null; path: string; anchor: string | null; pin: string | null }`, `ExtractedReferences = { refs: Reference[]; unshaped: string[] }`, `extractReferences(text)` (today's `extract`, with `cleanToken`, `classify`, `decodePercent`, `isSafe` private) and `hasExtension(path)`, which `resolveReferences` uses for `unmatched`. The pin pattern is `^(SOURCE_NAME_CHARS)@([A-Za-z0-9_./-]+):(.+)$`, built from the constant. `sources.mjs` keeps every other export and names `./references.mjs`; `tokens` goes, since only the test called it. `config.mjs` imports `isSourceName` from `./sources/source.mjs` and filters as D-007 says. In `config.schema.json`, `sources` gains `"propertyNames": { "pattern": "^[A-Za-z0-9_-]+$" }`. In `sources.test.mjs` the test at `:260` and the two `tokens` assertions at the top of the test at `:269` move to `references.test.mjs` unchanged but for the call (`extractReferences(text).refs`); the rest of `:269` stays.

**Done when:**
- **T-1.1** `loadConfig` on a config declaring `analysis` and `my.docs` returns one source, `analysis`, and the warning `source "my.docs" ignored: a source name may use letters, digits, "_" and "-"`; `config.test.mjs` asserts both.
- **T-1.2** `references.mts` builds its pin pattern from `SOURCE_NAME_CHARS`; `sources.mjs` defines no `classify`, `cleanToken`, `PIN` or `tokens`.
- **T-1.3** `references.test.mjs` holds the moved token cases with today's expected objects, plus one case where `my.docs@main:a.md` is not a pin; it imports no `node:child_process` and makes no temp folder.
- **T-1.4** `config.schema.json` `sources.propertyNames.pattern` is `^[A-Za-z0-9_-]+$`, and `config.test.mjs`'s schema checks pass.
- **T-1.5** `npm test` passes, with no other assertion in `sources.test.mjs` changed.
- **T-1.6** Driven: `picket source find analysis README` in this repository gives the same exit code and output shape as before the phase.

## Phase 2: Discovery and the pure D-005 rule

**Touch set:**
- `src/lib/util/git.mts`: `gitRead` gains `buffer` (D-005)
- `src/lib/shared/sources/places.mts`: new; `sources.mjs:38-108` moved, `liveLookup`
- `src/lib/shared/sources/resolve.mts`: new; `sources.mjs:251-300` over a `Lookup`
- `src/lib/shared/sources/sources.mjs`: discovery and rule leave; imports them
- `src/lib/shared/work/state.mts`: `storyIntake` passes `liveLookup()`, until phase 3
- `src/lib/verbs/packet/packet.mjs`: `describeCandidates` (`:84-91`) through `liveLookup()`
- `src/lib/verbs/preflight/preflight.mjs`: `listWorktrees` from `places.mjs` (`:11`)
- `test/kernel/git.test.mjs`: the `buffer` case
- `test/kernel/lookup-fixture.mjs`: new; `lookupOf`, `candidate`, `only`
- `test/kernel/resolve.test.mjs`: new; the rule as data
- `test/kernel/sources.test.mjs`: imports; `candidates` calls pass `places(root)`

**Changes:** `util/git.mts`: `GitReadOptions` gains `buffer?: boolean`; overloads make `gitRead(root, args, { buffer: true })` return `Buffer | null` with the bytes untouched, and leave the string form as it is. `places.mts` exports `SOURCE_MAX_BUFFER`, `Worktree = { path; branch: string | null; commit: string | null; main: boolean }`, `Branch = { branch; commit; checked_out: boolean }`, `Place = { kind: "worktree" | "branch"; label; worktree: string | null; branch: string | null; commit: string | null; main: boolean }`, `Candidate = Omit<Place, "kind"> & { sha256: string; dirty: boolean; bytes: Uint8Array }`, `listWorktrees(sourceRoot)`, `localBranches(sourceRoot, worktrees)`, `places(sourceRoot)`, `contentHash(bytes)`, `candidates(source, path, where)` (no default for `where`) and `liveLookup()`. Every git call is `gitRead` from `util/git.mts` with `SOURCE_MAX_BUFFER`; the code is today's, in the same order. `resolve.mts` as D-002 says. `sources.mjs` keeps `find`, `grep`, `pick`, `addRef`, the intake and drift functions until phases 3 and 4; its `git()` goes, the remaining reads in `find` and `liveBytes` use `gitRead`, and `gitGrep` stays until phase 4. `pick` and `addRef` each build one `liveLookup()` and pass it to `resolveReferences` and use its `candidates` and `labels`. Callers repoint: `state.mts` (`resolveReferences(text, sources, liveLookup())`), `packet.mjs`, `preflight.mjs`.

`lookup-fixture.mjs`: `lookupOf({ <source>: { <path>: Candidate[] } })` returns a `Lookup` whose `labels` are the labels of every candidate the source holds, in first-seen order; `candidate(label, sha256, { main, branch, worktree, commit, dirty, bytes })` fills the rest (`branch` defaults to the label, `bytes` to the label's text); `only(record, ...keys)` picks keys. `resolve.test.mjs` holds one test per case in the draft's migration list: single; identical with `main` preferred; identical without a main (the first wins); ambiguous (labels in place order); pin found; pin on the wrong branch (failure names the path, the branch and `searched <labels>`); unreachable pinned source (`is unreachable (<reason>)`) and undeclared (`not declared`); an unshaped path to `unmatched`; the 200-reference cap. One more case keeps the `#anchor` on the resolved record.

**Done when:**
- **T-2.1** `resolve.test.mjs` passes its eleven cases through `lookupOf`, with no git and no temp folder.
- **T-2.2** `resolve.mts` imports nothing from `node:fs`, `node:child_process` or `util/git.mts`.
- **T-2.3** `sources.mjs` defines no `git`, `listWorktrees`, `localBranches`, `places`, `candidates`, `contentHash`, `choose` or `resolveReferences`.
- **T-2.4** `git.test.mjs` shows `gitRead(repo, ["cat-file", "blob", "HEAD:a.txt"], { buffer: true })` returning a file committed with CRLF byte for byte, and `null` for a missing path.
- **T-2.5** `npm test` passes; in `sources.test.mjs` only import lines and the `candidates` calls changed.
- **T-2.6** Driven: in a temp project with a temp source whose `feat-x` copy differs, `picket open --ticket X-1 --story <file>` records the reference as ambiguous and `picket packet <id>` prints the `main`, `feat-x` and `old` lines as before.

## Phase 3: Intake leaves the work item model; `open` drives it

**Touch set:**
- `src/lib/shared/sources/intake.mts`: new; `sources.mjs:302-339` root first
- `src/lib/shared/sources/drift.mts`: new; `sources.mjs:385-411` root first
- `src/lib/shared/repos.mts`: `git mv` from `repos.mjs`, typed, root first
- `src/lib/shared/sources/sources.mjs`: intake and drift leave; `pick`, `addRef` take `(root, id, ...)`
- `src/lib/shared/work/state.mts`: `createWork` becomes `createItem` (D-003)
- `src/lib/shared/work/snapshot.mts`: `ambiguousRefs(root, id)`, `AmbiguousRef` from `resolve.mts`
- `src/lib/verbs/open/index.mts`: resolves, refuses, creates, writes intake, records bases
- `src/lib/verbs/source/pick.mts`, `src/lib/verbs/source/add.mts`: pass `root, id`
- `src/lib/shared/review-summary.mjs`: `liveDrift(root, id, ...)` (`:192`), `readBases(root, id)` (`:205`)
- `test/kernel/intake.test.mjs`: new; records without git
- `test/kernel/work-fixture.mjs`: `createWork` calls `createItem` then `recordBases`
- `test/kernel/review.test.mjs`: `readBases` order (`:49`); one `open` case

**Changes:** `intake.mts` exports `SNAPSHOT_MAX_BYTES`, `IntakeRecord = { refs: (ResolvedRef | AmbiguousRef)[]; unmatched: string[] }`, `readIntake(root, id): IntakeRecord | null`, `writeRecord(root, id, record)`, `snapshotInto(root, id, ref, bytes): ResolvedRef` (returns the record with `snapshot` set, or `snapshot: null` and `snapshot_reason` over the cap, instead of changing its argument), `writeIntake(root, id, resolution)` and `ambiguousRefs(root, id): AmbiguousRef[]`. Files through `workFile(root, id, "sources.yaml")` and `join(workDir(root, id), snapshot)`. `drift.mts` exports `Drift = { ref; snapshot_sha256; live_sha256: string | null; moved: boolean; reason?: string }` and `liveDrift(root, id, sources)`, with `liveBytes` private and `gitRead` for git. `repos.mts`: `RepoEntry = { path; default_branch: string | null }`, `RepoBase = { path; base }`, `nestedRepos(root)`, `recordBases(root, id): RepoBase[]`, `readBases(root, id): Record<string, string>`; `revParse` from `git.mts`, `branchingManifestPath` from `paths.mts`, YAML through `yaml-lite.mjs`. `state.mts`: `NewWork` becomes `NewItem` (same fields), `createItem` as D-003, `storyIntake` gone. `open` as D-003; its refusal message is today's `IntakeError` text. `sources.mjs` keeps only `find`, `grep`, `pick`, `addRef`, `LookupError`, `gitGrep`, built on `intake.mjs`, `resolve.mjs` and `places.mjs`.

**Done when:**
- **T-3.1** `state.mts` imports nothing under `sources/`, nor `repos` or `config`; no file under `src/` names `createWork`.
- **T-3.2** `sources.test.mjs` T-4.4 passes unchanged: a pin that matches nothing exits 2 with its `failures`, the error starts `source references not found:`, and no work folder exists.
- **T-3.3** `intake.test.mjs` shows, from a data `Resolution` in a temp folder: both record kinds written with D-001's key order, a document of `SNAPSHOT_MAX_BYTES + 1` bytes recorded with `snapshot: null` and a `snapshot_reason`, and `ambiguousRefs` returning only the ambiguous record.
- **T-3.4** `picket open --lane order --title x` in `review.test.mjs`'s umbrella project writes `repos.yaml` with `src/Orders` at its HEAD.
- **T-3.5** `sources.mjs` exports no `IntakeError`, `readIntake`, `writeIntake`, `ambiguousRefs` or `liveDrift`.
- **T-3.6** `npm test` passes; `sources.test.mjs` is unchanged in this phase.
- **T-3.7** Driven: `picket open` with a story naming `docs/pricing.md` against a temp source writes `story.md`, `sources.yaml` and the snapshot, and `picket summary <id>` reports `moved: false` for it.

## Phase 4: The source verbs own search, pick and add; every failure is a refusal

**Touch set:**
- `src/lib/util/git.mts`: `gitRun` gains `okExitCodes`, `maxBuffer`; `GitFailed` (D-005)
- `src/lib/verbs/source/reachable.mts`: `HIT_CAP`, `capped`; undeclared refuses with `{ declared }`
- `src/lib/verbs/source/find.mts`: `findPaths`, from `sources.mjs:115-129`
- `src/lib/verbs/source/grep.mts`: `grepHits`, from `sources.mjs:131-152`; `GitFailed` refused
- `src/lib/verbs/source/pick.mts`: `pick` as the action body, refusals (D-004)
- `src/lib/verbs/source/add.mts`: `addRef` as the action body, refusals (D-004)
- `src/lib/shared/sources/sources.mjs`: deleted; on the block's Files line
- `test/kernel/git.test.mjs`: `okExitCodes` and `GitFailed` cases
- `test/kernel/sources.test.mjs`: imports; three exit codes; two refusal assertions
- `src/skills/designing/steps/10-design.md`, `src/skills/ordering/steps/10-order.md`, `src/skills/resuming/SKILL.md`: read only, the `source pick` callers

**Changes:** `GitRunOptions` gains `maxBuffer?: number` and `okExitCodes?: readonly number[]`; a failed call whose exit status is listed returns its stdout as a string; any other failure throws `GitFailed` with today's message. `findPaths(source: ReachableSource, needle: string): SearchHits` and `grepHits(source, regex, { path }): SearchHits`, with `SearchHits = { hits: Hit[]; overflow: number }`, list places with `places` and read with `gitRead` (`find`) and `gitRun(..., { okExitCodes: [0, 1], maxBuffer: SOURCE_MAX_BUFFER })` (`grep`). `reachableSource` throws `Refused(<today's text>, { declared })` for an unknown name. `pick.mts` and `add.mts` read the record with `readIntake`, build one `liveLookup()`, and refuse with the details of D-004; `add` checks the item with `readState` first, as today. The `as unknown as` casts of today's adapters go. In `sources.test.mjs`, `find` and `grep` are imported from the verb files under their old names (`findPaths as find`), so the test bodies stay; `:113`, `:222` and `:301` expect 2 and read the JSON on stdout; `source add` of a word that is not a path, and `source pick` of a ref not in the record, each gain one assertion.

**Done when:**
- **T-4.1** `sources.mjs` no longer exists, and no file under `src/` or `test/` names `sources/sources.`, `LookupError` or `IntakeError`.
- **T-4.2** The three changed cases exit 2 with `"ok":false`: unknown label with `labels` `["main","feat-x","old"]`, invalid regex with an `error` starting `git grep failed:`, undeclared source with `declared` `["analysis"]`.
- **T-4.3** `source add <id> hello` exits 2 with `ref` `"hello"`; `source pick <id> docs/none.md main` exits 2 with `ref`; T-5.2 (differing versions) still exits 2 and now carries `candidates`.
- **T-4.4** `git.test.mjs` shows `gitRun(repo, ["grep", "-e", "zzz"], { okExitCodes: [0, 1] })` returning `""`, and `gitRun(repo, ["grep", "-e", "rate["], { okExitCodes: [0, 1] })` throwing `GitFailed` whose message starts `git grep failed:`; T-1.5 passes unchanged.
- **T-4.5** No file under `src/lib/shared/sources/` or `src/lib/verbs/source/` imports `node:child_process`.
- **T-4.6** The block reports a search of `src/skills` and `scripts` for readers of these verbs' exit code or stderr; the three `source pick` lines read neither.
- **T-4.7** Driven: against a temp source, `picket source grep analysis "rate["` exits 2 with `{"ok":false,"error":"git grep failed: ...","source":"analysis"}`.

## Phase 5: Protection takes `env` and `platform`

**Touch set:**
- `src/lib/shared/sources/protection.mts`: `git mv` from `source-paths.mjs`, typed (D-006)
- `src/lib/hooks/guard.bash.mjs`: import path (`:25`); `sourceRoots` (`:1130`); `underSource` (`:1097`, `:1104`, `:1116`)
- `src/lib/hooks/guard.scope.mjs`: import path (`:4`); the call at `:66`
- `src/lib/verbs/preflight/preflight.mjs`: import path (`:6`); `protectionScope` (`:106`)
- `src/hooks/README.md`: the helper's path (`:24`)
- `test/kernel/sources.test.mjs`: import path; `sourceRoots` and `underSource` arguments
- `test/hooks/handlers.test.mjs`: the helper path list (`:388`)

**Changes:** `protection.mts` exports `Platform`, `ProtectionScope = { kind: "folder" | "repository"; paths: string[]; topLevel: boolean }`, `SourceRoot = { name: string; paths: string[] }` and the five functions of D-006; `commonGitDir`, `worktreePaths` and `readText` stay private. `canonicalPath` lowercases when `platform === "win32"`, and every function that calls it passes its `platform` on. `sourceRoots` calls `loadConfig(projectRoot, env)`. The `.mjs` callers name `protection.mjs` and pass `process.env` and `process.platform` as D-006 says. The tests pass `process.env`-shaped objects as today and `process.platform`; one new case, without git, shows `canonicalPath` of a temp folder holding upper-case letters keeping its case for `"linux"` and lower-casing it for `"win32"`.

**Done when:**
- **T-5.1** `protection.mts` has the signatures of D-006 and contains no `process.platform` or `process.env`; the process-read scan in `conventions.test.mjs` passes with it.
- **T-5.2** Every `sourceRoots` and `underSource` call in `guard.bash.mjs` and `guard.scope.mjs` passes the platform; none ends in `, roots)`.
- **T-5.3** The three source-denial cases in `handlers.test.mjs` (`:313`, `:811`, `:1004`) pass unchanged, and its helper list names `shared/sources/protection.mts`.
- **T-5.4** The protection tests in `sources.test.mjs` (`:135`, `:387`) pass with only their arguments changed, and the `canonicalPath` case passes.
- **T-5.5** `src/hooks/README.md` names `src/lib/shared/sources/protection.mts`, and `npm test` passes.
- **T-5.6** Driven: a PreToolUse Write event for a file inside a temp source, piped to `dist/hooks/guard.scope.mjs` with the source's env set, is denied with `inside source analysis, which is read-only`.

## Phase 6: Repository tests keep what git decides

**Touch set:**
- `test/kernel/sources.test.mjs`: four tests leave; one assertion moves
- `test/kernel/resolve.test.mjs`: read; the replacements
- `test/kernel/intake.test.mjs`: read; snapshot bytes
- `test/kernel/references.test.mjs`: read; plain words and fragments

**Changes:** Four tests whose cases the data tests now cover leave `sources.test.mjs` (D-008): "a document only in the main worktree resolves single" (`:163`), "CRLF in the main worktree and LF on a branch" (`:198`), "ordinary words stay plain text" (`:249`) and "a #fragment and a markdown link target" (`:269`). Before deleting, each assertion is matched to a data test; an assertion with no match moves into a kept test instead of being lost. One is known: `:177`, a dirty copy records its worktree's HEAD commit, moves into "a working-copy edit is a candidate" (`:71`). The block's commit message names each dropped test and its replacements (draft R-2). The other real-git tests stay: listing, dirty copy, `find`, `grep` merge and invalid regex, the folder story, ambiguous then pick (T-4.3), the pin refusal (T-4.4), `source add` (T-5.1, T-5.2), drift (T-5.3, T-5.4), `sourceRoots` from a linked worktree (T-6.6), protection scope, preflight, SessionStart and the git-ignore check.

**Done when:**
- **T-6.1** The four named tests are gone, and the block maps each of their assertions to the data or kept test that now holds it.
- **T-6.2** `tempSource()` is called by 17 tests, down from 21, and every case of S-3's list (listing, CRLF hashing, dirty copy, drift, `sourceRoots`, snapshot git-ignore) still has a test.
- **T-6.3** The block records `duration_ms` of `node --test test/kernel/sources.test.mjs` before and after the phase on the same machine, and the after figure is lower.
- **T-6.4** `npm test` passes.

## Open questions

- **OQ-001** The draft targets under 5 s for `sources.test.mjs`. It took 19.1 s on 2026-10-23 with 25 tests; the four dropped tests account for about 3 s, and 17 tests that build a repository or spawn the CLI stay. Owner: the lead, with the user. Fallback: phase 6 records before and after times; a shared read-only source fixture or moving the CLI cases is a follow-up only if the user asks.
- **OQ-002** Phase 5 is `security: false`. It changes how the guards receive `env` and `platform` for source protection, which decides when the guard stops a write; no decision changes, and the denial tests pin that. Owner: the lead, to confirm with the user. Fallback: none needed to start; flip phase 5 to `security: true` if the user wants its own gate.

## Revision log

