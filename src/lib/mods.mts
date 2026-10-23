export const MOD_INSTALLS = ["default", "opt-in"] as const;

export type ModInstall = (typeof MOD_INSTALLS)[number];

export type ModEntry = { plugin: string; summary: string; description: string; install: ModInstall };

export const MODS = {
  status: {
    plugin: "picket-status",
    summary: "a band above the prompt with the open work item, its next action and its running agents",
    description: "The open work item and its agents, above the prompt",
    install: "default",
  },
  markdown: {
    plugin: "picket-markdown",
    summary: "a read-only pane beside the transcript for a Markdown path clicked in a reply",
    description: "Click a markdown file path in a reply to read it, read-only, in a pane beside the transcript",
    install: "default",
  },
  session: {
    plugin: "picket-session",
    summary: "a docked sidebar with this project's sessions and every agent of the current one",
    description: "Sessions of this project and every agent of this one, in a docked sidebar",
    install: "opt-in",
  },
} as const satisfies Record<string, ModEntry>;

export type ModName = keyof typeof MODS;
