import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ShellToken } from "../../../shared/escalation.mts";
import { stateRel } from "../../../shared/paths.mts";
import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import type { SourceRoot } from "../../../shared/sources/protection.mts";
import { BARE_KERNEL, classifyKernelCall, wrappedCommands } from "./kernel.mts";

export type Token = ShellToken;
export type Segment = Token[];
export type Classification = "safe" | "unknown" | "deny" | "kernel";
export type Decision = "allow" | "ask" | "deny";
export type Judgement = { decision: Decision | null; reason: string };
export type Refusal = { why: string; reason: string };
export type Escalation = { mode: string | null; session: string | null; agent: string | null; home: string };

export type GuardContext = {
  cwd: string;
  root: string;
  sources: SourceRoot[];
  depth: number;
  escalation: Escalation;
  tool: string;
  taintedNames?: string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  now: () => Date;
  evaluate: (command: string, ctx: GuardContext) => Judgement;
};

export type ReadingFlags = { hiddenExecution: boolean; sawWriteRedirect: boolean; sawBackground: boolean };
export type Reading<S> = ReadingFlags & { command: string; segments: Segment[]; redirectTargets: (string | null)[]; state: S };
export type SegmentPlace = { seg: Segment; hit: string | null; cwd: string | null; startCwd: string };

export type Dialect<S> = {
  name: "bash" | "powershell";
  read(command: string, ctx: GuardContext): Reading<S> | Judgement;
  classify(place: SegmentPlace, reading: Reading<S>, ctx: GuardContext): Classification | Judgement;
  cdTarget(seg: Segment, cwd: string | null): { to: string | null } | null;
  allows: boolean;
  hints: { escalate: string; denial: (command: string) => string };
};

export type ClassifyText = (text: string, cwd: string | null, depth: number) => Classification;
export type SegmentScope = { cwd: string | null; depth: number; hookRoot: string | null; platform: NodeJS.Platform; classifyText: ClassifyText };

export type RootRule = {
  class: "safe" | "unknown" | "deny" | "meta" | "check";
  check?: (tokens: Segment, scope: SegmentScope) => Classification;
  writeFlags?: RegExp;
  inert?: true;
  sourceReader?: true;
};

const SAFE_GIT_SUBCOMMANDS = new Set([
  "status", "log", "diff", "show", "blame", "branch", "remote", "tag",
  "ls-files", "ls-tree", "rev-parse", "describe", "shortlog", "reflog",
  "stash",
  "config",
]);

const DENY_GIT_SUBCOMMANDS = new Set(["push", "reset", "rebase", "checkout", "merge", "clean", "branch"]);

const DENIED_NAMES = [
  "sudo", "rm", "rmdir", "chmod", "chown", "chgrp", "dd", "mkfs",
  "shutdown", "reboot", "kill", "killall", "del", "erase",
  "Remove-Item", "ri",
  "Stop-Process", "Clear-Content", "Clear-Item", "Remove-ItemProperty",
  "Format-Volume", "Clear-Disk", "Stop-Computer", "Restart-Computer",
];

const META_NAMES = [
  "xargs", "eval", "sh", "bash", "zsh", "ksh", "dash", "env", "nohup",
  "timeout", "watch", "perl", "python", "python3", "node", "ruby",
  "powershell", "powershell.exe", "cmd", "cmd.exe", "pwsh",
  "npx", "ts-node", "tsx", "deno", "bun",
];

const INERT_READER: RootRule = { class: "safe", inert: true, sourceReader: true };
const DENY: RootRule = { class: "deny" };
const META: RootRule = { class: "meta" };

export const ROOTS: Readonly<Record<string, RootRule>> = {
  cd: { class: "safe", sourceReader: true },
  pwd: INERT_READER,
  ls: INERT_READER,
  dir: INERT_READER,
  cat: INERT_READER,
  head: INERT_READER,
  tail: INERT_READER,
  wc: INERT_READER,
  stat: INERT_READER,
  diff: INERT_READER,
  grep: INERT_READER,
  echo: { class: "safe", inert: true },
  printf: { class: "safe", inert: true },
  which: { class: "safe" },
  find: { class: "safe", writeFlags: /^-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)$/, sourceReader: true },
  rg: { class: "safe", writeFlags: /^--pre(=|$)/, sourceReader: true },
  tree: { class: "safe", writeFlags: /^(-o|--output)/, sourceReader: true },
  file: { class: "safe", writeFlags: /^(-C|--compile)$/, sourceReader: true },
  "Get-ChildItem": { class: "safe", sourceReader: true },
  "Select-String": { class: "safe", sourceReader: true },
  "Get-Content": { class: "unknown", sourceReader: true },
  git: { class: "check", check: checkGit },
  sed: { class: "check", check: checkSed },
  dotnet: { class: "check", check: checkDotnet },
  npm: { class: "check", check: checkNpmFamily },
  yarn: { class: "check", check: checkNpmFamily },
  pnpm: { class: "check", check: checkNpmFamily },
  ...Object.fromEntries(DENIED_NAMES.map((root) => [root, DENY])),
  ...Object.fromEntries(META_NAMES.map((root) => [root, META])),
};

export const SOURCE_GIT_READS = new Set(["log", "show", "diff", "blame", "status", "ls-files", "ls-tree", "rev-parse", "grep", "cat-file"]);
export const SOURCE_LISTING_FLAGS = new Set(["--list", "-l", "-a", "-r", "-v"]);
export const SOURCE_GIT_GLOBALS = new Set(["-C", "--git-dir", "--work-tree", "--no-pager"]);
const WORKTREE_DIR = ".worktrees";
const DELETE_ROOTS = new Set(["rm", "rmdir", "Remove-Item", "ri"]);
const GIT_GLOBALS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);
const GIT_OUTPUT_FLAG = /^--output(=|$)/;
const SED_QUIET_FLAGS = ["-n", "--quiet", "--silent"];
const SED_ADDRESS = String.raw`(\d+|\$|\/[^/]*\/)`;
const SED_PRINT = new RegExp(`^(${SED_ADDRESS}(,${SED_ADDRESS})?)?[p=]$`);
const DOTNET_SAFE_SUBCOMMANDS = new Set(["build", "test", "restore", "clean", "list", "--version", "--info", "--list-sdks", "--list-runtimes"]);
const NPM_DENY_SUBCOMMANDS = new Set(["publish", "unpublish", "deprecate", "owner", "adduser", "login", "logout", "token"]);
const NPM_READ_SUBCOMMANDS = new Set(["list", "ls", "outdated", "view", "why", "--version", "-v"]);
const NPM_SCRIPT_ALIASES = new Set(["run", "run-script", "test", "start", "build"]);

export const LOG_SINK_DIR = stateRel("");

export function decide(decision: Decision, reason: string): Judgement {
  return { decision, reason };
}

export function fallThrough(reason: string): Judgement {
  return { decision: null, reason };
}

function strings(tokens: readonly Token[]): string[] {
  return tokens.filter((t): t is string => typeof t === "string");
}

export function isSanctionedLogSink(target: string | null): boolean {
  if (typeof target !== "string" || !target) return false;
  const norm = target.split("\\").join("/");
  if (norm.includes("..")) return false;
  if (/[*?$`~]/.test(norm)) return false;
  if (!norm.toLowerCase().endsWith(".log")) return false;
  const dir = norm.slice(0, norm.lastIndexOf("/"));
  return dir.toLowerCase().endsWith(LOG_SINK_DIR);
}

export function classifyPrefixedCommand(commandClass: Classification): Classification {
  return commandClass === "deny" ? "deny" : "unknown";
}

export function stripGitGlobalOpts(tokens: readonly Token[]): Token[] {
  const rest = tokens.slice(1);
  let i = 0;
  while (i < rest.length) {
    const t = rest[i];
    if (typeof t !== "string" || !t.startsWith("-")) break;
    if (t.includes("=")) {
      i += 1;
      continue;
    }
    i += GIT_GLOBALS_WITH_VALUE.has(t) ? 2 : 1;
  }
  return ["git", ...rest.slice(i)];
}

function checkGitBranch(tokens: Token[]): Classification {
  const hasDeleteOrMove = tokens.some((t) => typeof t === "string" && /^-[a-zA-Z]*[DdMm]/.test(t));
  if (hasDeleteOrMove) return "deny";
  const hasPositionalArg = tokens.slice(2).some((t) => typeof t === "string" && !t.startsWith("-"));
  return hasPositionalArg ? "unknown" : "safe";
}

function checkGitConfig(tokens: Token[]): Classification {
  const hasWriteFlag = tokens.some((t) => t === "--global" || t === "--unset" || t === "--add");
  const looksReadOnly = tokens.some((t) => t === "--get" || t === "--list");
  return looksReadOnly && !hasWriteFlag ? "safe" : "deny";
}

function checkGit(rawTokens: Segment): Classification {
  const tokens = stripGitGlobalOpts(rawTokens);
  const verdict = checkGitSubcommand(tokens);
  const writesOutput = tokens.slice(2).some((t) => typeof t === "string" && GIT_OUTPUT_FLAG.test(t));
  return verdict === "safe" && writesOutput ? "unknown" : verdict;
}

function checkGitSubcommand(tokens: Token[]): Classification {
  const sub = tokens[1];
  if (sub === "stash") return tokens[2] === "list" ? "safe" : "unknown";
  if (sub === "branch") return checkGitBranch(tokens);
  if (sub === "config") return checkGitConfig(tokens);
  if (sub === "worktree") return tokens[2] === "list" ? "safe" : "unknown";
  if (sub === "submodule") return tokens[2] === "status" || tokens[2] === "summary" ? "safe" : "unknown";
  if (typeof sub !== "string") return "unknown";
  if (DENY_GIT_SUBCOMMANDS.has(sub)) return "deny";
  if (SAFE_GIT_SUBCOMMANDS.has(sub)) return "safe";
  return "unknown";
}

function namesWorktree(raw: string): boolean {
  if (/[*?]/.test(raw)) return false;
  const segs = raw.replace(/\\/g, "/").split("/");
  if (segs.includes("..")) return false;
  const i = segs.indexOf(WORKTREE_DIR);
  if (i === -1) return false;
  return segs.slice(i + 1).filter((s) => s !== "" && s !== ".").length >= 1;
}

function isWorktreeTeardown(tokens: Segment): boolean {
  const operands = strings(tokens.slice(1)).filter((t) => !t.startsWith("-"));
  return operands.length > 0 && operands.every(namesWorktree);
}

export function sedPrintOnly(seg: Segment): boolean {
  const args = seg.slice(1);
  const scripts: string[] = [];
  const positional: string[] = [];
  let quiet = false;
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (typeof t !== "string") return false;
    if (SED_QUIET_FLAGS.includes(t)) quiet = true;
    else if (t === "-e") {
      const script = args[++i];
      if (typeof script !== "string") return false;
      scripts.push(script);
    } else if (t.startsWith("-") && t !== "-") return false;
    else positional.push(t);
  }
  if (!scripts.length && positional.length) scripts.push(positional[0]);
  return quiet && scripts.length > 0 && scripts.every((s) => SED_PRINT.test(s));
}

function checkSed(tokens: Segment): Classification {
  return sedPrintOnly(tokens) ? "safe" : "unknown";
}

function checkDotnet(tokens: Segment): Classification {
  const [, sub, action] = tokens;
  if (sub === "nuget") return action === "push" || action === "delete" ? "deny" : "safe";
  if (sub === "format") return tokens.some((t) => t === "--verify-no-changes") ? "safe" : "unknown";
  if (sub === "sln") return action === "list" ? "safe" : "unknown";
  if (sub === "tool") return action === "install" || action === "uninstall" || action === "update" ? "unknown" : "safe";
  return typeof sub === "string" && DOTNET_SAFE_SUBCOMMANDS.has(sub) ? "safe" : "unknown";
}

function readPackageScript(scriptName: string, cwd: string | null): string | null {
  try {
    if (!cwd) return null;
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
    return pkg?.scripts?.[scriptName] ?? null;
  } catch {
    return null;
  }
}

function resolvePackageScript(scriptName: Token | undefined, scope: SegmentScope): Classification {
  if (typeof scriptName !== "string" || !scriptName) return "unknown";
  const scriptBody = readPackageScript(scriptName, scope.cwd);
  if (!scriptBody) return "unknown";
  return scope.classifyText(scriptBody, scope.cwd, 0);
}

function checkNpmFamily(tokens: Segment, scope: SegmentScope): Classification {
  const [, sub, next] = tokens;
  if (typeof sub !== "string") return "unknown";
  if (NPM_DENY_SUBCOMMANDS.has(sub)) return "deny";
  if (sub === "audit") return next === "fix" ? "unknown" : "safe";
  if (sub === "config") return next === "get" || next === "list" || next === "ls" ? "safe" : "unknown";
  if (NPM_READ_SUBCOMMANDS.has(sub)) return "safe";
  if (["install", "i", "ci", "pack"].includes(sub)) return "unknown";
  if (["exec", "dlx", "link"].includes(sub)) return "unknown";
  if (NPM_SCRIPT_ALIASES.has(sub)) return resolvePackageScript(sub === "run" || sub === "run-script" ? next : sub, scope);
  return resolvePackageScript(sub, scope);
}

export function ruleOf(root: unknown): RootRule | undefined {
  return typeof root === "string" && Object.hasOwn(ROOTS, root) ? ROOTS[root] : undefined;
}

export function writesWith(rule: RootRule, tokens: Segment): boolean {
  const flags = rule.writeFlags;
  return flags !== undefined && tokens.some((t) => typeof t === "string" && flags.test(t));
}

export function classifySegment(tokens: Segment, scope: SegmentScope): Classification {
  if (!tokens.length) return "unknown";
  if (tokens[0] === BARE_KERNEL && !wrappedCommands(tokens).length) return classifyKernelCall(tokens, scope);
  const root = normalizeRoot(tokens[0]);
  if (typeof root !== "string") return "unknown";
  const rule = ruleOf(root);
  if (rule?.check) return rule.check(tokens, scope);
  if (DELETE_ROOTS.has(root) && isWorktreeTeardown(tokens)) return "unknown";
  if (rule?.class === "deny") return "deny";
  if (rule?.class === "safe") return writesWith(rule, tokens) ? "unknown" : "safe";
  return "unknown";
}
