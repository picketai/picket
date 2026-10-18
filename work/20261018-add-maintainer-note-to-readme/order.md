---
kind: order
lane: order
title: Add maintainer note to README
date: 2026-10-18
audience: developer
sources: [request, README.md, package.json, .gitattributes, core/lib/verify.mjs, test/markdown-paths.test.mjs, test/names-picket.test.mjs]
phases:
  - n: 1
    files: [README.md]
    greps:
      - path: README.md
        pattern: "^## Status\\b[\\s\\S]*^## A note from the maintainer\\b(?![\\s\\S]*^## )"
      - path: README.md
        pattern: "^I did not set out to build Picket\\. It grew out of my own day-to-day work as I started using cloud platforms and AI agents in my professional life\\. It was not built for any particular company; it is simply the tool I use myself\\."
      - path: README.md
        pattern: "^I built it to give myself confidence in the work I do\\. LLMs are a great addition to a developer's toolbox, but they are not a silver bullet for engineering\\. Picket will keep changing as I learn more about LLMs and as the models themselves evolve\\."
      - path: README.md
        pattern: "^Picket won't write your specs for you, and it won't turn a spec into finished work on its own\\. It helps you implement your specs\\. It keeps your work sane and structured, so you don't have to worry at every step that the agent will go rogue on you\\."
      - path: README.md
        pattern: "^If you find Picket helpful, feel free to use it\\. I'm always glad to hear feedback and suggestions for improvement\\."
      - path: README.md
        pattern: "^Good luck engineering\\.\\s*(?![\\s\\S])"
      - path: README.md
        pattern: "cache 97% against 91%\\. The research lane is the one lane that costs more \\(outline gate\\)\\."
    tests: true
    drive: false
---
# Order: Add maintainer note to README

## Problem

The maintainer wants a personal closing note in `README.md`, with the text given verbatim in `work/20261018-add-maintainer-note-to-readme/request.md` (lines 3 to 13). `README.md` ends today with `## Status` (line 56 onward), whose last paragraph is the benchmark headline. The file is ASCII, stored LF in the index and checked out CRLF (`git ls-files --eol` shows `i/lf w/crlf`), and `package.json` lists it under `files`, so the note reaches the npm page on the next publish.

## Decisions

### D-001: Append the note verbatim as the last H2 section
**Decision:** Add `## A note from the maintainer` after the current last paragraph of `## Status`, separated by one blank line, with the five paragraphs copied byte for byte from the request: same wording, same straight ASCII apostrophes in "developer's", "won't", "don't" and "I'm", same semicolon, no added dashes or formatting. Keep the file's existing line endings (CRLF in the working copy; git normalises to LF in the index) and end the file with a single newline after "Good luck engineering.". No other line of `README.md` changes. The note is the user's own voice, so the writing rules (dash ban, plain English) are already met and nothing is edited for style.
**Instead of:** A separate `MAINTAINER.md` linked from the README: the request asks for a closing section of `README.md` itself, and a separate file would not show on the npm or repository front page.
**Risks:**
- **RISK-001** An editor or tool converts the apostrophes to typographic quotes or mixes LF lines into the CRLF file. Mitigation: the T-1.2 greps match the ASCII apostrophe exactly, and T-1.5 checks the diff touches only the appended lines.

## Scope
**In:** One new closing section in `README.md`.
**Out:** Any edit to existing README sections, the `## Status` changelog, `core/`, package metadata, or a release.

## Phase 1: Append the maintainer note
**Touch set:**
- `README.md`: closing section appended at end
- `work/20261018-add-maintainer-note-to-readme/request.md`: source of the verbatim text
**Changes:** Append the section from request lines 3 to 13 to the end of `README.md`, after the paragraph ending "The research lane is the one lane that costs more (outline gate).", with one blank line before the heading.
**Done when:**
- **T-1.1** `README.md` has `## A note from the maintainer` after `## Status`, and no `## ` heading follows it.
- **T-1.2** Each of the five paragraphs from request lines 5 to 13 appears in `README.md` character for character, with ASCII apostrophes.
- **T-1.3** The last non-blank line of `README.md` is `Good luck engineering.`, followed by exactly one line ending.
- **T-1.4** The benchmark paragraph that ended `## Status` is unchanged and still precedes the new heading.
- **T-1.5** `git diff --stat -- README.md` shows only added lines (12 insertions, 0 deletions), and no other tracked path outside `work/` is staged by this phase.
- **T-1.6** `npm test` passes, including `test/markdown-paths.test.mjs` and `test/names-picket.test.mjs`, which scan `README.md`.

## Open questions

none

## Revision log
