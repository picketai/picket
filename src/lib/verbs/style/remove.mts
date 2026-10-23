import { action } from "../../shared/action.mts";
import { hostFrom, type Host } from "../../shared/styling/host.mts";
import { renderReport, setupTerminal } from "../../shared/styling/setup.mjs";
import { uninstall } from "../../shared/styling/uninstall.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, UsageError, type Args } from "../../util/args.mts";
import { terminalPrompt } from "../../util/prompt.mts";
import { reportOutcome, type StyleReport } from "./report.mts";

export type RemoveInput = { all: boolean; dryRun: boolean; yes: boolean };

type RevertAll = (host: Host, options: { revert: true; dryRun: boolean; yes: boolean }) => Promise<StyleReport>;
type ChooseAndRemove = (host: Host, options: { yes: boolean }) => Promise<StyleReport>;

const revertAll = setupTerminal as unknown as RevertAll;
const chooseAndRemove = uninstall as unknown as ChooseAndRemove;

async function removeStyle({ all, dryRun, yes }: RemoveInput, host: Host): Promise<StyleReport> {
  return all ? revertAll(host, { revert: true, dryRun, yes }) : chooseAndRemove(host, { yes });
}

export const remove = action<RemoveInput, StyleReport>(async (input, context) => reportOutcome(await removeStyle(input, hostFrom(context, terminalPrompt()))));

function parseRemove(args: Args): RemoveInput {
  const all = flag(args, "all");
  const dryRun = flag(args, "dry-run");
  if (dryRun && !all) throw new UsageError("style remove --dry-run needs --all");
  return { all, dryRun, yes: flag(args, "yes") };
}

export const verb: VerbSpec<RemoveInput, StyleReport> = {
  usage: "style remove [--all [--dry-run]] [--yes]",
  output: "text",
  parse: parseRemove,
  run: remove,
  render: renderReport,
};
