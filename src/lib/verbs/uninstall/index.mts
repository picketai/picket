import { action, done, failed, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import { isHomeFolder } from "../../shared/install.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, type Args } from "../../util/args.mts";
import { programRunner } from "../../util/process.mts";
import { terminalPrompt } from "../../util/prompt.mts";
import { runUninstall, type UninstallDeps, type UninstallInput, type UninstallReport } from "./uninstall.mts";

const CLOSING = [
  "Picket is removed from this project.",
  "Also on this machine, if you want them gone:",
  "  picket style remove --all          the theme, font and terminal scheme",
  "  npm uninstall -g @picketai/picket  the picket command",
];

function refuseHome({ root, home, platform }: Context): void {
  if (isHomeFolder(root, home, platform)) throw new Refused(`refusing to uninstall from the home folder ${root}; run it inside a project or pass --root <path>`, { root });
}

export function uninstallFrom(deps: (context: Context) => UninstallDeps) {
  return action<UninstallInput, UninstallReport>(async (input, context) => {
    refuseHome(context);
    const report = await runUninstall(context.root, input, deps(context));
    return report.changes.some((change) => change.result === "failed") ? failed(report) : done(report);
  });
}

export const uninstall = uninstallFrom((context) => ({ exec: programRunner(context.platform), prompt: terminalPrompt() }));

function isRemoved(report: UninstallReport): boolean {
  return report.changes.every((change) => change.result === "removed" || (change.id === "work" && change.result === "kept"));
}

export function renderUninstall(report: UninstallReport): string {
  const lines = [`root: ${report.root}`];
  if (report.changes.length === 0) lines.push("Nothing of Picket's is left in this project.");
  for (const change of report.changes) lines.push(`${change.result.padEnd(9)} ${change.id}: ${change.summary}${change.detail ? ` · ${change.detail}` : ""}`);
  if (report.manual.length > 0) lines.push("Manual steps:", ...report.manual.map((step) => `  - ${step}`));
  if (isRemoved(report)) lines.push(...CLOSING);
  return lines.join("\n");
}

function parseUninstall(args: Args): UninstallInput {
  return { dryRun: flag(args, "dry-run"), yes: flag(args, "yes"), removeWork: flag(args, "remove-work") };
}

export const verb: VerbSpec<UninstallInput, UninstallReport> = {
  usage: "uninstall [--dry-run] [--yes] [--remove-work]",
  output: "text",
  parse: parseUninstall,
  run: uninstall,
  render: renderUninstall,
};
