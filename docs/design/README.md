# Design

Local copies of the two design artifacts Picket uses. The artifacts on claude.ai are the source; these folders are snapshots so the design is versioned with the code and readable without a claude.ai account.

| Folder | Artifact | What it is |
| --- | --- | --- |
| `picketai-design-system/` | https://claude.ai/artifact/78MVaNYN5PLKLWw2VUR7tx | The PicketAI design system: colour tokens, type, spacing, radii, the brand book and the cover |
| `status-line-canvas/` | https://claude.ai/artifact/JriMuvHWEkjXaiCQyZLiBe | The Picket status line canvas: the status line, the status band and the Markdown pane, today and proposed |

Both artifacts are private. Open them from the owner's account, or ask the owner to share them.

## What each folder holds

`docs/design/picketai-design-system/project/` holds the brand book `docs/design/picketai-design-system/project/README.md` (read it first), every token with its value and usage in `docs/design/picketai-design-system/project/tokens.json`, the cover `docs/design/picketai-design-system/project/components/Cover/preview.html` and the index `docs/design/picketai-design-system/project/design-system.json`.

`docs/design/status-line-canvas/project/` holds the board layout and pages in `docs/design/status-line-canvas/project/canvas.json`, one `.dc.html` file per artboard, and the design system's tokens as the canvas installed them in `docs/design/status-line-canvas/project/ds/picketai/tokens.json`.

The design system's tokens come from `core/themes/picketai.json` and `core/lib/styling/palette.mjs`. Change those files first, then re-sync the design system, then refresh this copy.

## Refresh

Ask Claude Code to read each artifact's project files into its folder here, for example: "refresh docs/design from its two artifacts". The Artifact tool's `read` action with `out_dir` set to the folder writes each file at its published path. List the artifact's files first, so a new artboard is not missed.

Then review the diff and commit it on its own: `docs(design): refresh from artifacts`.

Snapshot taken 2026-10-17: design system version 1792253904-2e16, canvas version 1792254375-2b9e.
