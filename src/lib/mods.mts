export type ModEntry = { summary: string; switch: string | null };

export const MODS = {
  status: {
    summary: "a band above the prompt with the open work item, its next action and its running agents, and a work pane (/picket-session) listing this project's sessions by what they need",
    switch: null,
  },
  markdown: {
    summary: "a read-only pane beside the transcript for a Markdown path clicked in a reply",
    switch: "mods.markdown",
  },
} as const satisfies Record<string, ModEntry>;

export type ModName = keyof typeof MODS;

export const RETIRED_PLUGINS = ["picket-status", "picket-markdown", "picket-session"] as const;
