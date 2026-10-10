---
kind: order
lane: order
title: Publishable package, neutral examples
date: 2026-10-10
audience: developer
sources: request.md; package.json; package-lock.json; core/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; core/lib/init.mjs; core/lib/paths.mjs; core/lib/vendor/shell-quote-parse.mjs; core/bin/picket.mjs; test/kernel/plugin-layout.test.mjs; CONTRIBUTING.md; npm pack --dry-run (today 700 files, work/ and bench/ included; a dot folder named in files ships, tried in a scratch package); git grep for the client vocabulary outside work/, artifacts/ and bench/results/ (26 files); core/skills/ordering/steps/30-gate.md; test/kernel/packet.test.mjs; core/lib/packet.mjs (WIDTH 100); core/lib/pr.mjs; core/lib/repos.mjs; core/skills/documenting/templates/api.md; core/skills/ticketing/templates/jira/; core/skills/ticketing/examples/jira/
phases:
  - n: 1
    files:
      - package.json
      - package-lock.json
      - LICENSE
      - core/.claude-plugin/plugin.json
      - test/kernel/plugin-layout.test.mjs
    greps:
      - path: package.json
        pattern: '"version": "1\.0\.0-alpha\.1"'
      - path: package.json
        pattern: '"license": "MIT"'
      - path: package.json
        pattern: 'git\+https://github\.com/picketai/picket\.git'
      - path: core/.claude-plugin/plugin.json
        pattern: '"version": "1\.0\.0-alpha\.1"'
      - path: LICENSE
        pattern: 'Copyright \(c\) 2026 Vlad Apetre'
    tests: true
    drive: true
  - n: 2
    files:
      - core/skills/ordering/steps/30-gate.md
      - core/skills/ordering/steps/10-order.md
      - core/skills/designing/steps/10-design.md
      - core/skills/reviewing/SKILL.md
      - core/skills/reviewing/steps/15-traced.md
      - core/skills/documenting/templates/api.md
      - core/skills/ticketing/templates/jira/bug.md
      - core/skills/ticketing/templates/jira/change-request.md
      - core/skills/ticketing/templates/jira/epic.md
      - core/skills/ticketing/templates/jira/user-story.md
      - core/skills/ticketing/examples/jira/bug.md
      - core/skills/ticketing/examples/jira/change-request.md
      - core/skills/ticketing/examples/jira/epic.md
      - core/skills/ticketing/examples/jira/spike.md
      - core/skills/ticketing/examples/jira/tech-debt.md
      - core/skills/ticketing/examples/jira/user-story.md
    greps:
      - path: core/skills/ordering/steps/30-gate.md
        pattern: '20260914-shop-412-stop-sync-write'
      - path: core/skills/ordering/steps/10-order.md
        pattern: 'SHOP-123'
      - path: core/skills/designing/steps/10-design.md
        pattern: 'SHOP-123'
      - path: core/skills/documenting/templates/api.md
        pattern: 'orderNumber'
    tests: true
    drive: false
  - n: 3
    files:
      - test/kernel/packet.test.mjs
      - test/kernel/pr.test.mjs
      - test/kernel/review.test.mjs
      - test/kernel/sources.test.mjs
      - test/markdown-paths.test.mjs
      - core/lib/pr.mjs
      - core/lib/repos.mjs
      - core/skills/documenting/scripts/filename.mjs
    greps:
      - path: core/lib/pr.mjs
        pattern: 'Shop/_git/Orders/pullrequest/412'
      - path: core/lib/repos.mjs
        pattern: 'src/Orders/'
      - path: core/skills/documenting/scripts/filename.mjs
        pattern: 'book-orders/confirm'
      - path: test/kernel/packet.test.mjs
        pattern: 'STOCK\.RESERVED_QTY'
      - path: test/kernel/sources.test.mjs
        pattern: 'SHOP-1'
    tests: true
    drive: false
---
# Order: Publishable package, neutral examples

## Problem

`@picketai/picket` is not ready for npm. Its URLs point at the old repository, its version is `1.0.0`, and its licence is the npm default (ISC). It has no `files` field, so `npm pack` ships all 700 tracked files, `work/` and `bench/` included. It also lists two runtime dependencies that the product never imports. Separately, the public repository still teaches with one client's domain: the TANKINHOUD telematics poll in the gate example, `RENT-` Jira keys, `Fleet/_git/Rent` URLs and a car-rental-for-assistance-companies domain in the ticketing and API examples. Records (`work/`, `artifacts/`, `bench/results/`) and git history stay as they are.

## Decisions

### D-001: a `files` whitelist that ships `core/` and the marketplace beside it
**Decision:** `package.json` gains `"files": ["core/", ".claude-plugin/marketplace.json", "LICENSE", "README.md"]`. `core/` is the whole plugin and the CLI (`bin` is `core/bin/picket.mjs`, and `pluginRoot()` in `core/lib/paths.mjs` resolves to `core/`). The marketplace file has to ship too, because `marketplaceRoot()` (`core/lib/init.mjs:136`) looks for `.claude-plugin/marketplace.json` in the folder above `core/`. Without that file, `picket init` installs nothing and reports "no marketplace beside the plugin". A scratch package showed that npm ships a dot folder when `files` names it.
**Instead of:** an `.npmignore` blacklist: every new top-level folder (the next `bench/` or `work/`) would ship until someone remembered to list it.
**Risks:**
- **RISK-001** The whitelist misses a file that a hook or `init` reads at run time. Mitigation: the Phase 1 drive installs the packed tarball into a temp folder, runs `init` from the installed copy and validates both manifests there.

### D-002: zero runtime dependencies
**Decision:** Remove `shell-quote`, because `core/` imports only Node built-ins and its own files. CONTRIBUTING.md:27 says so and `test/kernel/plugin-layout.test.mjs` enforces it. The parser is vendored at `core/lib/vendor/shell-quote-parse.mjs` and already carries the MIT copyright and permission notice of James Halliday. `opensrc` moves to `devDependencies`, because only the `opensrc` npm script uses it. Do both with `npm uninstall shell-quote` and `npm install -D opensrc@^0.7.2`, so `package-lock.json` changes only through npm. The package also takes version `1.0.0-alpha.1` (the SemVer decision in `.claude/MEMORY.md`), the plugin description, author `Vlad Apetre`, licence `MIT` with a `LICENSE` file, and `picketai/picket` URLs. `core/.claude-plugin/plugin.json` takes the same version.
**Instead of:** keeping `shell-quote` as a dependency for attribution: the vendored file already carries the notice that MIT requires, and the dependency would install code that nothing loads.

### D-003: one invented domain, an online bookshop, for every renamed example
**Decision:** Every client name outside the records becomes a name from one invented domain, so the examples stay concrete and agree with each other. Use this mapping:
- **Projects and repositories:** ADO project `Fleet` and repository `Rent` become `Shop` and `Orders`. So `src/Rent` becomes `src/Orders`, folder `rent/` becomes `orders/`, branch `rent-feat` becomes `orders-feat`, and `owner/rent` becomes `owner/orders`.
- **Jira and PR ids:** Jira keys `RENT-n` become `SHOP-n` and the label `rentals` becomes `orders`. PR 7287 becomes 412, and work id `20260914-rc-7287-stop-poll-write` becomes `20260914-shop-412-stop-sync-write`.
- **The gate example:**
  - the telematics poll becomes the nightly stock sync;
  - `WAGENS.TANKINHOUD` becomes `STOCK.RESERVED_QTY` and `Car.TankSize` becomes `Product.ReservedQty`;
  - `CarTelematicsColumnEvaluator.cs` and `CarTelematicsColumnChanges.cs` become `StockSyncColumnEvaluator.cs` and `StockSyncColumnChanges.cs`;
  - `RunTelematicsPollCommandHandler.cs` becomes `RunStockSyncCommandHandler.cs` and `ICarRepository.cs` becomes `IProductRepository.cs`;
  - `Rent.Fleet.Tests` becomes `Shop.Inventory.Tests` and `RentDbContext` becomes `ShopDbContext`;
  - LowFuel tests that computed litres become LowStock tests that computed units.
- **Ticketing and API prose:**
  - a rental order or reservation becomes a book order, and a vehicle becomes a book;
  - a licence plate becomes an ISBN, and `bestelbon` becomes `orderNumber`;
  - an assistance company becomes a partner store, and a back-office agent becomes a support agent;
  - vehicle type RTF becomes delivery type PICKUP, and `/api/b2a/reservations/{bestelbon}` becomes `/api/partners/orders/{orderNumber}`;
  - live GPS positions become live stock levels.

The money example in `core/output-styles/custom.md` (monthly rent at 7%) is everyday housing rent, not the client's domain, so it stays.
**Instead of:** neutral placeholders such as `Foo` and `src/App`: the gate packet and the Jira examples teach through concrete detail, and placeholders would remove it.

### D-004 (r2): comment lines naming the client change only with the user's approval
**Decision:** Nine existing comment lines name the client's repository or domain (OQ-001 lists them). The `comments` rule forbids rewording a comment without an approval recorded through `picket comment`. The user approved all nine and the approvals are recorded. Phase 3 writes eight of them exactly as recorded: the six in `core/lib/pr.mjs`, `core/lib/repos.mjs` and `core/skills/documenting/scripts/filename.mjs`, and the two in its test files. `.claude/scripts/lint.craft.mjs:40` is outside this order; the lead changes it in a fast change after the close.
**Instead of:** deleting the lines: the rule allows deletion only for a stale comment, and these still describe true behaviour.
**Risks:**
- **RISK-002** Until Phase 3 lands, `core/lib/pr.mjs`, `core/lib/repos.mjs` and `core/skills/documenting/scripts/filename.mjs` ship the client's repository name in comments. Mitigation: publish only after Phase 3 is approved.
- **RISK-003** Client names stay in git history and in the records of the public repository; the request keeps both as they are. Mitigation: none in this order. A history rewrite would be a separate, irreversible decision for the user.

## Scope

**In:** `package.json`, `package-lock.json`, `LICENSE`, the plugin version; client names in shipped skill text and in test fixtures.
**Out:** records and git history; `.claude/scripts/lint.craft.mjs:40` (a fast change after the close, D-004); publishing to npm; `.claude/MEMORY.md:3` ("repository still named AISpec") and the `D:/workspace/github/AISpec/...` paths in `core/skills/branching/templates/manifest.example.yaml`, which are not client names.

## Phase 1: A package npm can publish

**Touch set:**
- `package.json`: metadata, `files`, dependency moves
- `package-lock.json`: rewritten by npm only
- `LICENSE`: new, MIT, Vlad Apetre
- `core/.claude-plugin/plugin.json`: version `1.0.0-alpha.1`
- `test/kernel/plugin-layout.test.mjs`: versions match, `files` holds both

**Changes:** Per D-001 and D-002. In `package.json`, set these fields:
- `version`: `1.0.0-alpha.1`;
- `description`: the plugin's description;
- `author`: `Vlad Apetre`;
- `license`: `MIT`;
- `homepage`: `https://github.com/picketai/picket#readme`;
- `bugs.url`: `https://github.com/picketai/picket/issues`;
- `repository.url`: `git+https://github.com/picketai/picket.git`;
- `files`: as in D-001.

Make the dependency changes with the two npm commands in D-002. `LICENSE` is the standard MIT text with `Copyright (c) 2026 Vlad Apetre`. One new plugin-layout test asserts three things: `package.json` and `core/.claude-plugin/plugin.json` carry the same version, `files` holds `core/` and `.claude-plugin/marketplace.json`, and `package.json` has no `dependencies`. Drive the package with a script at `.picket/state/scratch/drive.mjs`, run through `picket drive --run`. The script must:
1. run `npm pack` into a temp folder;
2. install the tarball into another temp folder;
3. import `marketplaceRoot` from the installed `core/lib/init.mjs` and print what it returns;
4. run the installed `core/bin/picket.mjs init --root <temp project> --no-install`;
5. run `claude plugin validate` on the installed `core/` and on the installed package folder.

**Done when:**
- **T-1.1** `npm pack --dry-run --json` lists only `package.json`, `LICENSE`, `README.md`, `.claude-plugin/marketplace.json` and paths under `core/`.
- **T-1.2** `package.json` holds the fields above, has no `dependencies` key, and has `devDependencies` `{ "opensrc": "^0.7.2" }`. `core/.claude-plugin/plugin.json` has `"version": "1.0.0-alpha.1"`.
- **T-1.3** `package-lock.json` has no `node_modules/shell-quote` entry, and its `node_modules/opensrc` entry has `"dev": true`.
- **T-1.4** The new plugin-layout test passes, and it fails when the plugin version is set to `1.0.0-alpha.0`.
- **T-1.5** Drive: from the installed tarball, `marketplaceRoot()` returns the installed package folder. `init --no-install` exits 0 and writes `CLAUDE.md` and `.picket/config.json` in the temp project. `claude plugin validate` passes on both folders.
- **T-1.6** `npm test` passes.

## Phase 2: Neutral examples in the shipped skills

**Touch set:**
- `core/skills/ordering/steps/30-gate.md`: gate packet example
- `core/skills/ordering/steps/10-order.md`: `RENT-123` to `SHOP-123`
- `core/skills/designing/steps/10-design.md`: `RENT-123` to `SHOP-123`
- `core/skills/reviewing/SKILL.md`: `src/Rent` to `src/Orders`
- `core/skills/reviewing/steps/15-traced.md`: `src/Rent/Fees.cs` example finding
- `core/skills/documenting/templates/api.md`: the eight API examples
- `core/skills/ticketing/templates/jira/bug.md`: title example
- `core/skills/ticketing/templates/jira/change-request.md`: title example
- `core/skills/ticketing/templates/jira/epic.md`: title, label, weak/strong example
- `core/skills/ticketing/templates/jira/user-story.md`: title and label examples
- `core/skills/ticketing/examples/jira/bug.md`, `change-request.md`, `epic.md`, `spike.md`, `tech-debt.md`, `user-story.md`: rewritten in the bookshop domain

**Changes:** Apply the D-003 mapping. The gate example in `30-gate.md` keeps its shape, line for line:
- the id line;
- the headline "The nightly stock sync can no longer write RESERVED_QTY on either cycle.";
- the same tests, lint and verified lines;
- two file names, then `+7 more`, which is what the packet prints within 100 columns;
- two decisions;
- the commit line;
- the options line.

Each ticketing example and `api.md` keeps every heading, table column and section order. Only domain words change, and sentences are rewritten where a literal swap would read wrong. Example: "Confirm reservation endpoint returns 500 when vehicle type is RTF and voucher is absent" becomes "Confirm order endpoint returns 500 when delivery type is PICKUP and voucher is absent". Sentry, SignalR and other generic tools may stay.

**Done when:**
- **T-2.1** `git grep -n -I -i -E "TANKINHOUD|WAGENS|telematic|LowFuel|rc-7287|RENT-[0-9]|reservation|rental|vehicle|bestelbon|b2a|assistance compan|licence plate|\brent\b|\bfleet\b" -- core` prints only the six OQ-001 comment lines in `core/lib/pr.mjs`, `core/lib/repos.mjs` and `core/skills/documenting/scripts/filename.mjs` (Phase 3 rewrites them), plus the one `rent` line in `core/output-styles/custom.md`.
- **T-2.2** `git diff -U0 -- core/skills | grep -E '^[-+]#'` prints nothing: no heading changed.
- **T-2.3** The `30-gate.md` example shows `20260914-shop-412-stop-sync-write` and the files line `StockSyncColumnEvaluator.cs, StockSyncColumnChanges.cs, +7 more`, and every line in it is at most 100 characters.
- **T-2.4** `npm test` passes, including `test/markdown-paths.test.mjs`.

## Phase 3: Neutral fixtures in the tests

**Touch set:**
- `test/kernel/packet.test.mjs`: the gate block fixture and its assertions
- `test/kernel/pr.test.mjs`: PR URLs, repos and findings
- `test/kernel/review.test.mjs`: nested repo `src/Orders`, branches
- `test/kernel/sources.test.mjs`: `orders/` documents, `SHOP-1`
- `test/markdown-paths.test.mjs`: the `src/Rent` non-path span
- `core/lib/pr.mjs`: approved comment lines 15 to 17 and 48
- `core/lib/repos.mjs`: approved comment line 2
- `core/skills/documenting/scripts/filename.mjs`: approved comment line 40

**Changes:** Apply the D-003 mapping to string literals and identifiers only. Every assertion keeps its meaning and its counts.

In `packet.test.mjs`, the headline still stops at the colon with `…`. The files line still shows exactly two whole names, then `+8 more`. If the new names change how many whole names fit in 100 characters, change the names, not the assertion.

In `pr.test.mjs`, the URL shapes stay: server, services and legacy hosts, with the collection, project, repository and PR number in the same positions. The finding texts get bookshop sentences, for example "the gift-wrap path skips the guard. A cancelled order still starts a shipment."

Per D-004 (r2), replace the eight approved comment lines (OQ-001, all but `.claude/scripts/lint.craft.mjs:40`) with exactly the text recorded in `work/20261010-publishable-package-neutral-examples/comments.jsonl`; no other comment changes.

**Done when:**
- **T-3.1** The T-2.1 grep run over `core test` prints only the `rent` line in `core/output-styles/custom.md`.
- **T-3.2** `packet.test.mjs` asserts the headline `  The nightly stock sync can no longer write STOCK.RESERVED_QTY on either cycle…` and the files line `StockSyncColumnEvaluator.cs, StockSyncColumnChanges.cs, +8 more`.
- **T-3.3** `grep -c '^test(' <file>` gives the same count before and after for each of the five files: no test was added or removed.
- **T-3.4** `npm test` passes.
- **T-3.5** Each of the eight comment lines equals its recorded text in `comments.jsonl` character for character, and `guard.comments` allowed every edit.

## Open questions

- **OQ-001** Approve these replacements for the nine comment lines that name the client (D-004)? Owner: user. Resolved 2026-10-10: all nine approved and recorded with `picket comment`; Phase 3 writes eight, and `.claude/scripts/lint.craft.mjs:40` waits for a fast change after the close.
  - `core/lib/pr.mjs:15`: ` * Azure DevOps Server:   https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/412`
  - `core/lib/pr.mjs:16`: ` * Azure DevOps Services: https://dev.azure.com/org/Shop/_git/Orders/pullrequest/412`
  - `core/lib/pr.mjs:17`: ` * Legacy Services:       https://org.visualstudio.com/Shop/_git/Orders/pullrequest/412`
  - `core/lib/pr.mjs:48`: ` * down (an umbrella with \`src/Orders\` as its own clone is the common shape here). Returns the repo`
  - `core/lib/repos.mjs:2`: `// The root's \`git diff\` sees such a repo only as one untracked entry (\`src/Orders/\`), so the review`
  - `core/skills/documenting/scripts/filename.mjs:40`: `// API subjects are usually an endpoint path (e.g. "POST /v1/book-orders/confirm").`
  - `.claude/scripts/lint.craft.mjs:40`: `//   node .claude/scripts/lint.craft.mjs -C src/Orders      # run against a nested repo`
  - `test/kernel/pr.test.mjs:84`: `  // an umbrella whose src/Orders is the clone: the kernel finds the nested repository on its own`
  - `test/kernel/review.test.mjs:22`: `/** A project root (its own repo) with one nested product repo at src/Orders on branch main. */`

## Revision log

- 2026-10-10: D-004 (r2): approved comment texts written in Phase 3, lint.craft.mjs left to a later fast change; T-2.3 matches the packet's two names and `+7 more` (user ruling).
