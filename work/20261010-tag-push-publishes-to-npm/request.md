Release automation: pushing a version tag to GitHub publishes the matching version to npm.
1. A "version" script in package.json that copies the new version into core/.claude-plugin/plugin.json and stages it, so `npm version prerelease --preid alpha` bumps both files in one commit and tag.
2. .github/workflows/release.yml: on push of a v* tag, checkout, setup Node, npm ci, npm test, fail when the tag does not match package.json's version, then publish to npm with access public and dist-tag alpha for a prerelease version (or latest for a stable one). Use npm trusted publishing (OIDC: permissions id-token: write, npm CLI 11.5.1 or later), no NPM_TOKEN secret.
3. CONTRIBUTING.md: a short "Releasing" section with the two commands (npm version prerelease --preid alpha, then pushing trunk with --follow-tags) and the one-time trusted-publisher setup on npmjs.com.
The first publish of 1.0.0-alpha.1 is done by hand; this flow takes every release after it.
