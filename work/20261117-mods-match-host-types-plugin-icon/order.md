---
kind: order
lane: order
title: Mods match host types, plugin icon
date: 2026-11-17
audience: developer
sources: work/20261117-mods-match-host-types-plugin-icon/request.md; preflight.txt; src/mods/status/hooks/index.test.tsx; src/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; scripts/build.mjs; scripts/test.mjs; test/repo/package.test.mjs; test/repo/build.test.mjs; dist/.claude-plugin/types/claude-code/index.d.ts (written by 2.1.325); claude plugin validate --strict and --json on dist and on a scratch probe plugin under 2.1.326; claude plugin test dist under 2.1.326 (137 pass); PIL and ImageMagick probes of assets/Pixel Corgi PicketAI Logo.png, 2026-11-17
phases:
  - n: 1
    files:
      - src/mods/status/hooks/index.test.tsx
      - src/.claude-plugin/icon.png
      - test/repo/package.test.mjs
    greps:
      - path: src/mods/status/hooks/index.test.tsx
        pattern: "\\bkind: 'local_agent'"
      - path: src/mods/status/hooks/index.test.tsx
        pattern: '\btaskStatus:'
      - path: src/mods/status/hooks/index.test.tsx
        pattern: '\btokenSamples:'
      - path: src/mods/status/hooks/index.test.tsx
        pattern: '\bhasRow:'
      - path: test/repo/package.test.mjs
        pattern: '\.claude-plugin/icon\.png'
    tests: true
    drive:
      - covers: T-1.1
        command: node scripts/build.mjs && claude plugin validate --strict dist
        exit_code: 0
        contains:
          - "Validation passed"
      - covers: T-1.2
        command: claude plugin validate --strict dist | grep -c ICON_MISSING
        exit_code: 1
        contains:
          - "0"
      - covers: T-1.3
        command: python3 -c 'from PIL import Image; a=Image.open("assets/Pixel Corgi PicketAI Logo.png"); b=Image.open("src/.claude-plugin/icon.png"); ok=b.size==(1312,1312) and b.mode=="RGBA" and b.crop((0,56,1312,1255)).tobytes()==a.tobytes() and b.crop((0,0,1312,56)).getextrema()[3]==(0,0) and b.crop((0,1255,1312,1312)).getextrema()[3]==(0,0); print("icon matches the logo" if ok else "icon differs"); raise SystemExit(0 if ok else 1)'
        exit_code: 0
        contains:
          - "icon matches the logo"
      - covers: T-1.4
        command: cmp src/.claude-plugin/icon.png dist/.claude-plugin/icon.png
        exit_code: 0
      - covers: T-1.5
        command: sha256sum "assets/Pixel Corgi PicketAI Logo.png"
        exit_code: 0
        contains:
          - "7c37740d463eda06eb152c8334a91849d4ad673fa40b0d1134163a4a19cf358e"
      - covers: T-1.7
        command: git diff --name-only 2abb18ab -- src/mods src/.claude-plugin/plugin.json | grep -c -v -x src/mods/status/hooks/index.test.tsx
        exit_code: 1
        contains:
          - "0"
---
# Order: Mods match host types, plugin icon

## Problem

Under Claude Code 2.1.326 the `mods` step of `npm test` stops at `claude plugin validate --strict dist`, which reports one warning that strict mode fails: `index.test.tsx` line 173, `TS2740`, because the host's `AgentInfo` gained eight required fields that the test's `developer()` roster entry lacks. `claude plugin test dist` itself passes 137 of 137 on this host, so that one type error is the whole failure. The same validator run lists `ICON_MISSING` among its plugin directory findings: it looks for `.claude-plugin/icon.png` inside the plugin folder (`dist`), a square PNG of 512 to 2048 px under 2 MB. The logo must reach the listing with its artwork unchanged.

## Decisions

### D-001: Give the test's roster entry the eight fields 2.1.326 requires
**Decision:** `developer()` in `src/mods/status/hooks/index.test.tsx` keeps its return type `AgentInfo` and gains the eight required fields, read from the 2.1.326 type by probing `validate --strict --json` on a scratch plugin (the types file on disk is still the 2.1.325 one): `kind: 'local_agent'` (the type is `"local_agent" | "in_process_teammate"`; the test's `SPAWN` is a background Agent call, not a teammate), `taskStatus: 'running'` (one of `running`, `pending`, `completed`, `failed`, `killed`, `paused`; it agrees with `status`), `label: 'developer'` (string), `startTime: NOW` (number, the test's clock), `cwd: 'D:/repo'` (string, the `START` root), `tokenCount: 0` (number), `tokenSamples: []` (number array), `hasRow: true` (boolean). A probe object with exactly these fields passed `validate --strict` under 2.1.326 with no warning. No mod source reads any of the eight fields, so no behaviour under test changes. This gives up nothing the request wants; it ties the fixture to the host's current shape, which is the point.
**Instead of:** a cast (`as AgentInfo`) or a `Partial` spread: it compiles against any future host type, so it would hide the next drift that the mods step exists to report.
**Risks:**
- **RISK-001** A later Claude Code release adds more required fields and the step goes red again. Mitigation: `scripts/test.mjs` already names host type errors with the Claude Code version (`hostMismatchReport`), so the next fix starts from that line.

### D-002: The icon source sits at src/.claude-plugin/icon.png and ships through the existing copy
**Decision:** the square icon is committed at `src/.claude-plugin/icon.png`, beside the manifest it belongs to. `scripts/build.mjs` already copies every file under `src/` that `isCopied` accepts (not a test, not mod source, not a built module) byte for byte to the same relative path under `dist/`, so it lands at `dist/.claude-plugin/icon.png`, the first place the validator looks, with no build change and no `icon` key in `plugin.json`. The existing test "every copied file in dist/ is its source" in `test/repo/build.test.mjs` then pins the copy, and `SHIPPED` in `test/repo/package.test.mjs` gains the path so the npm tarball must carry it. This reads the request's `.claude-plugin/icon.png` as a path inside the plugin, as the validator's own message spells it (see OQ-001).
**Instead of:** the repo-root `.claude-plugin/icon.png` plus a new copy line in `scripts/build.mjs`: that folder is the development marketplace (`marketplace.json`), never shipped, and the choice needs new build code to do what the source tree already does.
**Risks:**
- **RISK-002** Writing a binary under `src/` from a shell may raise a guard or permission dialog. Mitigation: the user approves it in the dialog; nothing in the phase depends on how the file is written.

### D-003: Pad 56 rows above and 57 below, fixed, and check pixels rather than bytes
**Decision:** the icon is a 1312 x 1312 RGBA PNG with the logo's 1312 x 1199 pixels pasted unchanged at x 0, y 56; rows 0 to 55 and 1255 to 1311 are fully transparent (1312 minus 1199 is 113 rows, the smaller half, 56, on top). It is made once by a command that is not committed, for example `magick "assets/Pixel Corgi PicketAI Logo.png" -background none -gravity north -splice 0x56 -gravity south -splice 0x57 src/.claude-plugin/icon.png`, which probed to a 702,662 byte file that passes the T-1.3 check; a PIL paste onto a transparent canvas passes too. Re-encoding changes the file bytes, so the check decodes both images and compares pixels. The logo carries no PNG metadata chunks that PIL exposes (no colour profile), so none is lost. This gives up an icon that follows the logo automatically: a new logo needs the command run again.
**Instead of:** `-gravity center -extent 1312x1312`: the split of an odd 113 rows is left to the tool, so the check could not name the rows; and generating the icon in the build would add an image library to a build that has none.
**Risks:**
- **RISK-003** `assets/` is untracked, so T-1.3 and T-1.5 read it from the main checkout only. Mitigation: the item has no worktree (`git worktree list` shows only `trunk`); the developer runs both checks from `/mnt/work/development/github/picket`.

## Scope

**In:**
- The eight `AgentInfo` fields in `developer()` in the status mod's hook test.
- A square icon at `src/.claude-plugin/icon.png`, copied to `dist/.claude-plugin/icon.png` by the existing build, and listed in the package test's `SHIPPED`.

**Out:**
- Any change to the logo's artwork, and committing `assets/`.
- README, `plugin.json`, `scripts/build.mjs`.
- Other host drift, and any mod source change.

## Phase 1: The roster fixture matches 2.1.326 and the plugin ships its icon

**Touch set:**
- `src/mods/status/hooks/index.test.tsx`: `developer()` lacks eight fields
- `src/.claude-plugin/icon.png`: new padded square icon
- `test/repo/package.test.mjs`: tarball must ship the icon
- `scripts/build.mjs`: read only, copies src files
- `test/repo/build.test.mjs`: read only, pins copied bytes
- `assets/Pixel Corgi PicketAI Logo.png`: read only, the logo

**Changes:**
- In `developer()` at `src/mods/status/hooks/index.test.tsx:173`, add the eight fields with the values D-001 lists; leave every other line of the file as it is.
- Create `src/.claude-plugin/icon.png` as D-003 specifies, from the logo, with a one-off command that is not committed.
- Add `".claude-plugin/icon.png"` to the `SHIPPED` list in `test/repo/package.test.mjs`.

**Done when:**
- **T-1.1** After `node scripts/build.mjs`, `claude plugin validate --strict dist` exits 0 and prints `Validation passed`, with no `error TS` line.
- **T-1.2** The same validator output holds no `ICON_MISSING` line (`grep -c ICON_MISSING` prints `0`).
- **T-1.3** `src/.claude-plugin/icon.png` is a 1312 x 1312 RGBA PNG whose rows 56 to 1254 equal the logo's pixels exactly and whose rows 0 to 55 and 1255 to 1311 have alpha 0 everywhere (the PIL check prints `icon matches the logo`).
- **T-1.4** `dist/.claude-plugin/icon.png` is byte-identical to the source (`cmp` exits 0), and the tarball test in `test/repo/package.test.mjs` fails when `.claude-plugin/icon.png` is missing from `npm pack --dry-run` of `dist/`.
- **T-1.5** The logo is unchanged: `sha256sum` of `assets/Pixel Corgi PicketAI Logo.png` prints `7c37740d463eda06eb152c8334a91849d4ad673fa40b0d1134163a4a19cf358e`, the hash captured on base `2abb18ab` before the first edit.
- **T-1.6** `npm test` exits 0 on this host under Claude Code 2.1.326, its `mods` step included (validate, then `claude plugin test dist` with 0 fail).
- **T-1.7** Against base `2abb18ab`, the only changed path under `src/mods/` or at `src/.claude-plugin/plugin.json` is `src/mods/status/hooks/index.test.tsx` (the filtered `git diff --name-only` count prints `0`).

## Open questions

- **OQ-001** The request names `.claude-plugin/icon.png`; this record reads it as the path inside the plugin (`src/.claude-plugin/` in source, `dist/.claude-plugin/` built), not the repo-root marketplace folder. Owner: the user. Fallback: `src/.claude-plugin/icon.png` as D-002 says; moving it later is a rename plus one build copy line.

## Revision log
