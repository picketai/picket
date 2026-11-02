Make the picket-status band and work pane match the approved canvas boards, which are the visual spec for SDR-00002 (artifacts/strategy/decisions/00002-session-list-merges-picket-status.md). Local copies of the boards: tmp/canvas-spec/project/BandEntry.dc.html and tmp/canvas-spec/project/WorkPane.dc.html (HTML mockups; their data is sample data; colours are PicketAI hex values whose Claude Code theme keys are in src/mods/shared/theme.ts and the PicketAI design system). The design item 20261102-session-list-merges-into-picket-status-design shipped the behaviour; this item fixes what it drew differently. The session name prefix ([PIC-123], SDR TF-006) stays out of scope.

Band (BandEntry.dc.html):
1. The entry pieces are separated by " · " in the rule tone: `◀ 3 need you · ☰ 12 · M↓`.
2. `☰ <n>` and `M↓` use the control tone (accent-shimmer, claudeShimmer); `◀ <n> need you` stays warning bold.
3. `/picket-markdown` with no argument toggles: run while its pane is open, it closes the pane and keeps the last document; so `M↓` toggles the Markdown pane as `☰` toggles the work pane. With a path it always shows that file.

Work pane (WorkPane.dc.html, default tweak "every row"):
4. Header: `WORK` at the left; at the right `◀ <n> need you` in warning bold when n > 0, else `nothing waits` muted.
5. Tabs: `Active <n>   Done <n>   Cleanup <n>`, the selected tab bold and underlined in the text tone, the others muted, no background; on the Done tab an `⊘` icon at the right of the tab row starts Delete all.
6. Group headers: `▾ NEEDS YOU` warning, `▾ WORKING` accent, `▾ OPEN` muted, `▾ CLOSED` success, `▾ NO WORK ITEM` muted, all bold, the count right-aligned muted; each folds to `▸` on press; NO WORK ITEM starts folded.
7. Each session is: an action row right-aligned above the title with `⧉ ✎ ✓` (Done tab: `⧉ ✎ ↺ ⊘`) in the control tone, ✓ in success on closed sessions; then the title row (live dot, title, age right-aligned muted); then a detail row indented two columns: for a work item `<lane> <phase dots> <next step>` with the lane in accent, approved dots accent, open dots rule, the next step in its state tone (warning bold with ◀ for your gate, error bold for blocked, accent with ⋯ while working, muted otherwise) and `+<n>` when the session carries more items; for a closed item `closed ⎇ <branch>` plus `worktree` in warning while its worktree is on disk; no detail row for a session with no work item. The selected session's three rows take the row highlight.
8. Peek is its own section at the bottom of the pane below a rule: `PEEK` bold muted with `read-only` at the right, then the selected session's title and its items' lines; the list above keeps its own height and shows `↓ <n> more` when it overflows.
9. Cleanup: `WORKTREES ON DISK` (warning) with the hint "Closed items whose worktree is still there." and `OLD SESSIONS` (muted) with "Over 14 days old, no work item."; each row has `⧉ ✓` right-aligned above the title, the title with its size right-aligned, and the path or age below; ⧉ copies the remove command or the resume command.

Verification: every criterion is checked against the board files, and the reviewer compares the drawn mock-engine output with them.

## Brief
purpose: Make the picket-status band and work pane look as the approved canvas boards show, which the SDR-00002 design item drew differently
in scope: Band separators, button colours and the /picket-markdown toggle; work pane header, tabs, coloured foldable group headers, three-row sessions with action and detail rows, Peek as its own bottom section, Cleanup layout; checked against tmp/canvas-spec boards
out of scope: Session name prefixes (SDR TF-006); new behaviour beyond the boards; kernel changes other than what the detail row needs
