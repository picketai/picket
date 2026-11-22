# Security policy

Picket guards what an AI agent may run and write, so a way past one of its guards is a security problem, and we want to hear about it in private first.

## Supported versions

Picket is an alpha. Fixes go into the next release under the npm `alpha` tag; older versions are not patched. Check yours with `picket --version`.

## Reporting a vulnerability

Report it privately through GitHub: open the [Security tab](https://github.com/picketai/picket/security) of this repository and choose "Report a vulnerability", or go straight to the [report form](https://github.com/picketai/picket/security/advisories/new). Please do not open a public issue for it.

Include what lets us reproduce it:

- the Picket version, the Claude Code version and your operating system;
- what you ran or asked for, and what happened;
- what you expected a guard or the kernel to do instead.

Never paste a real secret, key or token into the report; name the variable instead.

## What counts

- A tool call that a guard should deny and does not, such as a destructive command or a write to a file the kernel owns.
- A way to commit, push or publish without the approval a gate asks for.
- A secret written to a log, a work item or a report.
- Text from a web page, ticket or pull request that Picket follows as an instruction.

A wrong lane, a failed check or a confusing message is a bug, not a vulnerability: open a normal [issue](https://github.com/picketai/picket/issues/new/choose) for it.
