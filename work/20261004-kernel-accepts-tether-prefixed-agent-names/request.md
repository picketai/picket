Add a kernel function that turns an agent type such as `tether:analyst` into the bare name `analyst`, and use it in every hook that reads an agent type, starting with `.claude/hooks/lib/transcript.mjs` where the agent-name pattern stops at the colon.

Source: TF-001 of `artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md` (D-002: the kernel accepts both forms and strips the prefix in one function that every hook uses). Escalated from fast item 20261004-strip-tether-prefix-from-agent-types: the touch set with tests is five files.
