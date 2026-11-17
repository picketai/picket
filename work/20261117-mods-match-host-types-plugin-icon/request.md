Make `npm test` pass on Claude Code 2.1.326 and give the plugin its listing icon.

1. The mods step fails with one type error: `hooks/mods/status/hooks/index.test.tsx:173:37 TS2740`. The host's `AgentInfo` type gained required fields that the test's `developer()` object lacks. Add the fields the 2.1.326 type requires so the mods match the host types again.
2. `claude plugin validate --strict dist` warns `ICON_MISSING`. Ship a square icon with the plugin at `.claude-plugin/icon.png`: the user's logo `assets/Pixel Corgi PicketAI Logo.png` (1312 x 1199 PNG) padded with transparent space above and below to 1312 x 1312, nothing else changed. The build copies it into `dist` so the validator finds it.

Done when: `npm test` passes on this host and `claude plugin validate --strict dist` prints no ICON_MISSING warning.

## Brief
purpose: npm test passes on Claude Code 2.1.326 and the plugin ships a listing icon
in scope: the AgentInfo fields in the status mod's hook test; a square icon at .claude-plugin/icon.png copied into dist
out of scope: any change to the logo's artwork; README; other host drift
