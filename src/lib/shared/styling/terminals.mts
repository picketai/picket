import type { Change } from "./change.mts";
import type { Host } from "./host.mts";
import type { Manifest, ManifestItem, Unapplied } from "./manifest.mts";

type EnvMatch = { env: string | readonly string[]; equals?: string };

export const TERMINALS = {
  "windows-terminal": { name: "Windows Terminal", detect: { env: "WT_SESSION" } },
  "terminal-app": { name: "Terminal.app", detect: { env: "TERM_PROGRAM", equals: "Apple_Terminal" } },
  konsole: { name: "Konsole", detect: { env: "KONSOLE_VERSION" } },
  ptyxis: { name: "Ptyxis", detect: { env: "PTYXIS_VERSION" } },
  "gnome-terminal": { name: "GNOME Terminal", detect: { env: ["GNOME_TERMINAL_SCREEN", "GNOME_TERMINAL_SERVICE"] } },
} as const satisfies Record<string, { name: string; detect: EnvMatch }>;

export type TerminalId = keyof typeof TERMINALS;
export type PlanOptions = { family: string };

export type TerminalWriter = {
  plan: (host: Host, manifest: Manifest, options: PlanOptions) => Change[];
  unapply: (item: ManifestItem, host: Host) => Unapplied;
};

function matches(env: NodeJS.ProcessEnv, { env: names, equals }: EnvMatch): boolean {
  const variables = typeof names === "string" ? [names] : names;
  return variables.some((name) => (equals === undefined ? Boolean(env[name]) : env[name] === equals));
}

export function detectTerminal(env: NodeJS.ProcessEnv): TerminalId | "other" {
  const ids = Object.keys(TERMINALS) as TerminalId[];
  return ids.find((id) => matches(env, TERMINALS[id].detect)) ?? "other";
}
