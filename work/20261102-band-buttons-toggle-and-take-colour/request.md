Two fixes to the picket-status band buttons and the markdown mod, from SDR-00002 and design item 20261102-session-list-merges-into-picket-status-design:
1. /picket-markdown toggles: run while its pane is open, it closes the pane (as /picket-session already toggles the work pane). The band's M↓ button therefore toggles the Markdown pane.
2. The band buttons ☰ <n> and M↓ draw in the default text colour (pure white in the terminal). Colour them as the design says: accent-shimmer (theme key claudeShimmer), like every clickable icon; ◀ <n> need you stays warning.

## Brief
purpose: Make the band's M↓ button toggle the Markdown pane and give both band buttons their accent colour, as the design for SDR-00002 shows
in scope: /picket-markdown closes its pane when run while the pane is open; ☰ <n> and M↓ drawn in accent-shimmer (claudeShimmer); ◀ <n> need you stays warning
out of scope: Any other band or pane change; the work pane's behaviour; release and QA items deferred by the design item
