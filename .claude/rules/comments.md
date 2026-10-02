# Comments in code

Always loaded. It covers every agent and the lead, in every lane.

Write no new comments in code. Names, types, small functions and tests carry the meaning. If a comment seems needed to explain what code does, rename or extract instead.

The ban covers every comment form, doc comments included: XML `<summary>`, `<remarks>`, `<param>`, `<returns>`, `<example>`; JSDoc; Python docstrings; markup comments; line and block comments of any language.

Only these lines are exempt: machine directives (`eslint-disable`, `@ts-expect-error`, `noqa`, `#pragma`, `SuppressMessage`), licence, copyright and SPDX headers, generated-file banners, shebang and encoding lines.

A request or plan that asks to "document" behaviour never licenses comments. That text goes to an external document: a change list, or an API reference through `documenting api`.

The one exception is a why for a specific value or condition that the code cannot show. Never write it yourself. Propose it to the user with path, line and text. Only an approval recorded with `harness comment <id> --path <p> --text "<t>"` lets it past `guard.comments`, the hook that denies an edit adding a comment line.

Example: `const ROUNDING = 0.5` rounds half-up because the tariff table is published that way. No name says that, so propose `src/fee.ts:42 "half-up: the tariff table is published that way"` and write it only after the user approves.

If your change makes an existing comment stale, fix it or delete it. Leave other existing comments as they are.
