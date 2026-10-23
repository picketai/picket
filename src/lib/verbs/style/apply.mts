import { action } from "../../shared/action.mts";
import { COMPONENT_NAMES } from "../../shared/styling/components.mts";
import { hostFrom } from "../../shared/styling/host.mts";
import { applyStyle, renderReport } from "../../shared/styling/plan.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, list, UsageError, type Args } from "../../util/args.mts";
import { terminalPrompt } from "../../util/prompt.mts";
import { reportOutcome, type StyleReport } from "./report.mts";

export type ApplyInput = { only: string[] | null; dryRun: boolean; yes: boolean };

const KNOWN: readonly string[] = COMPONENT_NAMES;

export const apply = action<ApplyInput, StyleReport>(async (input, context) => reportOutcome(await applyStyle(hostFrom(context, terminalPrompt()), input)));

function parseOnly(args: Args): string[] | null {
  const only = list(args, "only");
  if (only.length === 0) return null;
  const unknown = only.find((name) => !KNOWN.includes(name));
  if (unknown !== undefined) throw new UsageError(`style apply does not know "${unknown}"; use one of ${COMPONENT_NAMES.join(", ")}`);
  return only;
}

function parseApply(args: Args): ApplyInput {
  return { only: parseOnly(args), dryRun: flag(args, "dry-run"), yes: flag(args, "yes") };
}

export const verb: VerbSpec<ApplyInput, StyleReport> = {
  usage: "style apply [--only theme,font,terminal,statusline] [--dry-run] [--yes]",
  output: "text",
  parse: parseApply,
  run: apply,
  render: renderReport,
};
