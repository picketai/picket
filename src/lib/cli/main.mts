import { readFileSync } from "node:fs";
import { pluginManifestPath, projectRoot } from "../shared/paths.mts";
import { describeExit, EXIT, type ExitCode, type Outcome } from "../shared/action.mts";
import { edgeContext } from "../shared/context.mts";
import type { VerbSpec } from "../shared/verb-spec.mts";
import { flag, parseArgs, str, UsageError, type Args } from "../util/args.mts";
import { isGroup, listCommands, VERB_NAMES, type Command, type GroupEntry, type VerbEntry } from "../verbs.mts";
import { REGISTRY, type SpecModule } from "./registry.mts";

const USAGE_LINE = "usage: picket <verb> [args] [--pretty | --human]";
const VERSION_LINE = "picket --version   print the installed version";

type Resolved = { command: Command; rest: string[] };
type Printing = { asText: boolean; pretty: boolean };

const RENAMED: Record<string, string | null> = {
  new: "open",
  "review-summary": "summary",
  extensions: "extension list",
  "extension new": "extension add",
  "find-verdict": null,
  "setup-terminal": "style apply",
  uninstall: "style remove",
  pr: "pullrequest prepare",
};

const readStdin = (): string => readFileSync(0, "utf8");

function entryOf(name: string): VerbEntry | GroupEntry | undefined {
  const names: Record<string, VerbEntry | GroupEntry> = VERB_NAMES;
  return Object.hasOwn(names, name) ? names[name] : undefined;
}

function summaryOf(command: Command): string {
  const [name, sub] = command.split(" ");
  const entry = entryOf(name);
  if (!entry) return "";
  return isGroup(entry) ? (entry.subverbs[sub]?.summary ?? "") : entry.summary;
}

function verbNames(): string[] {
  return Object.keys(VERB_NAMES);
}

function unknownVerb(name: string): UsageError {
  return new UsageError(`unknown verb "${name}". Verbs: ${verbNames().join(" ")}`);
}

function resolveCommand(pos: string[]): Resolved {
  const [name, sub, ...afterSub] = pos;
  const entry = entryOf(name);
  if (!entry) throw unknownVerb(name);
  if (!isGroup(entry)) return { command: name as Command, rest: pos.slice(1) };
  if (sub === undefined || !Object.hasOwn(entry.subverbs, sub)) throw new UsageError(`${name} needs one of: ${Object.keys(entry.subverbs).join(", ")}`);
  return { command: `${name} ${sub}` as Command, rest: afterSub };
}

async function commandHelp(command: Command): Promise<string> {
  const { verb } = await REGISTRY[command]();
  return `picket ${verb.usage}\n  ${summaryOf(command)}`;
}

async function fullHelp(): Promise<string> {
  const commands = await Promise.all(listCommands().map(commandHelp));
  return [USAGE_LINE, "", `verbs: ${verbNames().join(" ")}`, "", VERSION_LINE, "", commands.join("\n\n")].join("\n");
}

async function helpFor(name: string | undefined): Promise<string> {
  if (name === undefined) return fullHelp();
  const commands = listCommands().filter((command) => command === name || command.startsWith(`${name} `));
  if (commands.length === 0) throw unknownVerb(name);
  return (await Promise.all(commands.map(commandHelp))).join("\n\n");
}

function installedVersion(): string {
  return JSON.parse(readFileSync(pluginManifestPath(), "utf8")).version;
}

function asJson(value: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
}

function printing<I, O>(spec: VerbSpec<I, O>, args: Args): Printing {
  const asText = spec.output === "text" ? !flag(args, "json") : flag(args, "human");
  return { asText, pretty: flag(args, "pretty") };
}

function formatOutcome<I, O>(spec: VerbSpec<I, O>, outcome: Outcome<O>, { asText, pretty }: Printing): string {
  if (!asText) return asJson(describeExit(outcome).json, pretty);
  return outcome.status === "refused" ? `refused: ${outcome.message}` : spec.render(outcome.value);
}

async function runCommand({ command, rest }: Resolved, args: Args): Promise<ExitCode> {
  const { verb: spec }: SpecModule = await REGISTRY[command]();
  const verbArgs = { ...args, pos: rest };
  const print = printing(spec, verbArgs);
  const root = str(verbArgs, "root") ?? projectRoot();
  const outcome = await spec.run(spec.parse(verbArgs), edgeContext(root));
  console.log(formatOutcome(spec, outcome, print));
  return describeExit(outcome).code;
}

function renamedFrom([name, sub]: string[]): string | undefined {
  return [`${name} ${sub}`, name].find((old) => Object.hasOwn(RENAMED, old));
}

function renamed(old: string): UsageError {
  const now = RENAMED[old];
  return new UsageError(now === null ? `"${old}" was removed` : `"${old}" is now "${now}"`);
}

async function dispatch(argv: string[]): Promise<number> {
  const args = parseArgs(argv, readStdin);
  const [name, topic] = args.pos;
  if ("version" in args.opt) {
    console.log(installedVersion());
    return EXIT.done;
  }
  if ("help" in args.opt || name === undefined || name === "help") {
    console.log(await helpFor(name === "help" ? topic : undefined));
    return EXIT.done;
  }
  const old = renamedFrom(args.pos);
  if (old !== undefined) throw renamed(old);
  return runCommand(resolveCommand(args.pos), args);
}

export async function main(argv: string[]): Promise<number> {
  try {
    return await dispatch(argv);
  } catch (err) {
    console.error(`picket: ${(err as Error).message}`);
    return err instanceof UsageError ? EXIT.usage : EXIT.crash;
  }
}
