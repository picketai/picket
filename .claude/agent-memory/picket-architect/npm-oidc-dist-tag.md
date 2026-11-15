---
name: npm-oidc-dist-tag
description: npm runs the trusted-publishing OIDC exchange for dist-tag add/ls from 11.21.0 (not 11.20.0, which has it only in publish); the machine's npm is 11.20.0; npm view and npm pack of public packages work from here
metadata:
  type: reference
---

npm 11.21.0's `lib/commands/dist-tag.js` calls the OIDC exchange before `add` and `ls` (checked 2026-11-11 in the tarball fetched with `npm pack npm@11.21.0` into the scratchpad). In 11.20.0, the machine's npm (Volta, Node 26), only `publish` calls it, and the exchanged token lives in memory for that one process, so a later `npm dist-tag` process in the same CI job has no token. The release workflow's pin `npm install -g npm@11.21.0` (in `.github/workflows/release.yml`) is therefore load-bearing for any dist-tag step.

Whether the registry grants dist-tag rights to a trusted publisher token is server-side and only a live run shows it.

The network reaches the public registry from here: `npm view @picketai/picket dist-tags --json` and `npm pack <pkg>@<version>` work, so a third-party client premise can be read from the published source instead of recalled.

**How to apply:** a record that adds an npm command under OIDC names the npm version that supports it and keeps the pin. Related: [[npm-pack-facts]].
