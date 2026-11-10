---
kind: report
title: npm install standards versus Picket install
date: 2026-11-10
audience: developer
sources:
  - work/20261110-npm-install-standards-versus-picket-install/request.md
  - artifacts/reports/how-other-harnesses-clis-install.md
  - package.json
  - dist/package.json
  - dist/bin/picket.mjs
  - src/lib/util/node-floor.mjs
  - docs/how-to.md (what you get, install, updating, removing)
  - README.md (install lines)
  - .github/workflows/release.yml (publish job)
  - .github/scripts/release.mjs (distTag)
  - npm registry view of @picketai/picket (dist-tags, engines, bin, attestations)
  - npm registry view of create-vite (dist-tags)
  - https://docs.npmjs.com/cli/v11/commands/npm-exec
  - https://docs.npmjs.com/cli/v11/commands/npm-install
  - https://docs.npmjs.com/cli/v11/commands/npm-dist-tag
  - https://docs.npmjs.com/cli/v11/configuring-npm/package-json
  - https://docs.npmjs.com/cli/v11/using-npm/config
  - https://docs.npmjs.com/trusted-publishers
  - https://nodejs.org/api/packages.html
  - https://clig.dev/
  - https://nextjs.org/docs/app/getting-started/installation
  - https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/README.md
  - web search: npx @latest and cache staleness
confidence: medium
---
# Report: npm install standards versus Picket install

## Summary
Picket's publish side matches npm's documented conventions: a prerelease goes out under its own dist-tag, `bin` has a node shebang, `files` is an allow list, `engines` is declared and enforced at startup, and the publish job uses trusted publishing with provenance on the registry [VERIFIED]. The run-once `npx pkg@tag verb` form is documented by npm, but widely cited practice recommends `@latest` for such commands and npm's docs are silent on how a cached run picks up a newer version, so Picket's "rerun the same command to update" advice rests on convention and reported behaviour, not on npm guidance [VERIFIED, INFERRED]. The main departure from convention is that `latest` and `alpha` both point at 1.0.0-alpha.5, which npm treats as legal but says projects usually avoid; it also means a plain `npx @picketai/picket init` works today and silently changes meaning at the first stable release [VERIFIED]. The prior report's complaint about two tools and a restart is not an npm-standards question: npm has no guidance on updating a CLI that also installs a plugin [INFERRED]. Community sources split between "install globally" and "run with npx @latest"; Picket's "nothing installed globally" stance is the second, common for scaffolders, and uncommon for a tool a user runs every day [INFERRED].

## Context
Scope as understood: compare how Picket installs and recommends installing its npm package (`npx @picketai/picket@alpha init`, the `alpha` dist-tag, `npm publish ./dist`, `engines`, update text) with official npm and Node.js guidance and widely cited community practice, building on the prior report. Changing Picket, plugin internals and non-npm managers (except as contrast) are out of scope.

Read: the local files above in full; npm docs pages for exec, install, dist-tag, package.json, config and trusted publishers; Node.js packages docs; clig.dev; Next.js and create-vite install text; one web search on npx staleness. npm docs pages and clig.dev were returned summarised by the fetch tool, not as raw text, and quotes come from those summaries. I did not run `npx` against a stale cache.

## Findings
- **R-001** [VERIFIED] The package is published from `dist/` with `npm publish ./dist --access public --tag "$DIST_TAG"`. The tag is the first prerelease identifier (`alpha`), and `latest` only for a version with no prerelease part. This matches npm's documented use of `--tag` to leave `latest` unchanged. `.github/workflows/release.yml:131`, `.github/scripts/release.mjs:18-24`; npm-dist-tag page.
- **R-002** [VERIFIED] The registry has `latest` and `alpha` both on `1.0.0-alpha.5`. npm says "no tag has any special significance" beyond `latest` and projects "typically" reserve `latest` for stable releases; a first-ever publish with no `latest` gets one by default, the likely cause [INFERRED]. create-vite, for comparison, has `latest` at a stable 9.3.4 and a separate `beta`. `npm view @picketai/picket dist-tags`, `npm view create-vite dist-tags`; npm-dist-tag page.
- **R-003** [VERIFIED] The documented install is `npx @picketai/picket@alpha init`, with "nothing stays on your PATH". npm-exec documents that a non-local package goes to the npm cache, that npm prompts before installing unless `--yes` is given (assumed when stdin is not a TTY or in CI), and that the binary is inferred from `bin`. `docs/how-to.md:39-41`, `README.md:3`; npm-exec page.
- **R-004** [VERIFIED] The npm-exec page does not say how a run with a tag or `@latest` picks up a newer version; it lists only cache config (`prefer-online`, `prefer-offline`, `offline`, all default `false`). A web search shows reports that `npx pkg@latest` can run a cached older version and a maintainer calling cache reuse a design choice; those are issue-tracker and blog sources, not confirmed current behaviour [UNKNOWN for npm 11.20]. Picket's update text says to rerun `npx @picketai/picket@alpha init` and does not mention the cache. `docs/how-to.md:361`; npm-exec and config pages; web search.
- **R-005** [VERIFIED] `engines.node` is `>=22` in both manifests and is advisory: npm warns only unless `engine-strict` (default `false`) is set. Picket does not rely on that: `bin/picket.mjs` calls `checkNodeFloor(process.versions.node)` first and exits 1 with "Picket needs Node 22 or newer; this is <version>". Because the entry is ESM with a dynamic import after the check, the refusal runs before any lib code loads. `dist/package.json:16-18`, `dist/bin/picket.mjs:5-10`, `src/lib/util/node-floor.mjs:1-5`; package-json and config pages. Whether Node 20 parses the file at all (top-level await) is not tested [UNKNOWN].
- **R-006** [VERIFIED] `bin.picket` is `bin/picket.mjs` and the built file starts with `#!/usr/bin/env node`. `files` is an allow list that excludes `**/*.test.*`. npm requires the shebang and says `files` patterns are an inverse `.gitignore`. `dist/package.json:19-37`, `dist/bin/picket.mjs:1`; package-json page.
- **R-007** [VERIFIED] The root `package.json` is `private: true` and carries `devEngines` (node >=24, `onFail: error`); the published `dist/package.json` has neither and no `publishConfig`. Access and tag are passed on the command line. The split keeps dev-only settings out of the published manifest. `package.json:4,23-29`, `dist/package.json`, `release.yml:131`.
- **R-008** [VERIFIED] Provenance is in place. The publish job sets `id-token: write` and upgrades npm to 11.21.0 on Node 24; there is no `--provenance` flag and none is needed, because npm's trusted-publishing page says provenance is generated by default for OIDC publishes from a public repository. The registry shows an SLSA provenance attestation for alpha.5. `release.yml:95-110`, `npm view` attestations; trusted-publishers page. Whether the package has a trusted publisher configured on npmjs.com, as opposed to the attestation alone, is not shown by the files [UNKNOWN].
- **R-009** [VERIFIED] Community practice for scaffolders and run-once CLIs is the `@latest` suffix: Next.js documents `npx create-next-app@latest` and `npm i next@latest`, and `npm create vite@latest`. Both use `latest` as the stable channel. Picket's `@alpha` follows the same shape with a prerelease channel, but its docs ask the user to "leave the `@alpha` on" without saying when to switch. Next.js's update path is its own verb, `npx next upgrade`. Next.js install docs, create-vite README; `docs/how-to.md:41`.
- **R-010** [VERIFIED] clig.dev advises distributing as a single binary or through the platform's installer, "tread lightly on the user's computer", and putting uninstall instructions at the bottom of install instructions. Picket's install instructions end at "Check the install"; the uninstall section is separate further down. Picket does write to shared files (the prior report's R-006). clig.dev; `docs/how-to.md:79-110,361-380`.
- **R-011** [VERIFIED] Node.js's own docs list only `name`, `main`, `type`, `exports` and `imports` as fields Node uses; `bin`, `files` and `engines` belong to npm. So the only normative sources for Picket's manifest are npm's docs, which it follows. nodejs.org packages page.
- **R-012** [INFERRED] The "nothing is installed globally" stance fits npm's `npx` design (cache, prompt, bin inference) but not the global install that npm's `bin` field also supports and that OpenSpec, spec-kit and other peers use (prior report R-003). npm gives no recommendation between the two. The consequence in Picket is that verbs outside a session need the long `npx @picketai/picket@alpha <verb>` form. `docs/how-to.md:7,13`; package-json page; prior report.
- **R-013** [VERIFIED] The `npm install` page documents a case that touches Picket's tag choice: bare `npm install pkg` installs `latest`, and a named tag that does not exist fails. Version ranges match only stable releases unless a prerelease is named. So a user who runs `npm install -g @picketai/picket` today gets the alpha, and one who runs `npm install @picketai/picket@^1.0.0` would not get later alphas. The docs warn against the first install; the shadow check handles the second. npm-install page; `docs/how-to.md:45-51`.

## Dependencies and relationships
Relies on the npm registry, Node 22 or later, and trusted publishing from GitHub Actions (npm CLI 11.21.0 in the workflow). The `claude plugin` steps are covered by the prior report.

## Risks and unknowns
- [UNKNOWN] Whether `npx @picketai/picket@alpha init` runs a stale cached version on npm 11.20; not tested here (R-004).
- [UNKNOWN] Whether Node 20 can parse `dist/bin/picket.mjs` to reach the floor message (R-005).
- [UNKNOWN] Whether a trusted publisher is configured on npmjs.com (R-008).
- [UNKNOWN] Community practice was sampled, not surveyed: Next.js, create-vite, clig.dev and one search. No Node.js CLI authoring guide (for example the npm blog or Sindre Sorhus's guidance) was read.
- [ASSUMPTION] npm docs and clig.dev text came through a summarising fetch tool; quoted phrases should be rechecked against the raw pages before reuse.
- [ASSUMPTION] The registry values were read once on 2026-11-10 and will change at the next release.

## Recommendations
Describing only. Where Picket departs from or goes beyond published convention: `latest` on a prerelease (R-002), update text that does not address the npx cache (R-004), and the choice of no global install (R-012). Whether to change any of them is a design decision [ARCHITECT REVIEW NEEDED]. The `latest` choice also decides what a bare `npx @picketai/picket init` means at the first stable release, a release-policy call [STRATEGIC REVIEW NEEDED].

## Glossary
- **dist-tag**: a movable npm label (`alpha`, `latest`) that points at one published version.
- **Trusted publishing**: npm's OIDC-based way to publish from CI without a stored token; it also generates provenance.
- **Provenance**: a signed record on the registry of which repository and workflow built a version.
