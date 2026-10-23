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

export const SAFE_ROOTS = new Set([
  "cd", "pwd", "ls", "dir", "cat", "head", "tail", "wc", "tree", "stat",
  "file", "diff", "echo", "printf", "find", "grep", "rg", "which",
  "Get-ChildItem", "Select-String", "Select-Object", "Sort-Object",
  "Measure-Object",
  "tsc", "eslint", "prettier", "jest", "vitest", "mocha", "cypress",
  "webpack", "rollup", "esbuild", "vite", "next", "react-scripts",
  "babel", "playwright",
]);

const SAFE_GIT_SUBCOMMANDS = new Set([
  "status", "log", "diff", "show", "blame", "branch", "remote", "tag",
  "ls-files", "ls-tree", "rev-parse", "describe", "shortlog", "reflog",
  "stash",
  "config",
]);

const DENY_GIT_SUBCOMMANDS = new Set(["push", "reset", "rebase", "checkout", "merge", "clean", "branch"]);

export const DENY_ROOTS = new Set([
  "sudo", "rm", "rmdir", "chmod", "chown", "chgrp", "dd", "mkfs",
  "shutdown", "reboot", "kill", "killall", "del", "erase",
  "Remove-Item", "ri",
  "Stop-Process", "Clear-Content", "Clear-Item", "Remove-ItemProperty",
  "Format-Volume", "Clear-Disk", "Stop-Computer", "Restart-Computer",
]);

export const META_ROOTS = new Set([
  "xargs", "eval", "sh", "bash", "zsh", "ksh", "dash", "env", "nohup",
  "timeout", "watch", "perl", "python", "python3", "node", "ruby",
  "powershell", "powershell.exe", "cmd", "cmd.exe", "pwsh",
  "npx", "ts-node", "tsx", "deno", "bun",
]);

export const INERT_ROOTS = new Set(["cat", "head", "tail", "wc", "ls", "dir", "grep", "echo", "printf", "stat", "diff", "pwd"]);

export const SOURCE_READERS = new Set(["cd", "pwd", "cat", "head", "tail", "wc", "ls", "dir", "stat", "tree", "file", "diff", "grep", "rg", "Get-ChildItem", "Select-String", "Get-Content"]);
export const SOURCE_GIT_READS = new Set(["log", "show", "diff", "blame", "status", "ls-files", "ls-tree", "rev-parse", "grep", "cat-file"]);
export const SOURCE_LISTING_FLAGS = new Set(["--list", "-l", "-a", "-r", "-v"]);
export const SOURCE_GIT_GLOBALS = new Set(["-C", "--git-dir", "--work-tree", "--no-pager"]);
export const FIND_ACTIONS = /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/;
export const READER_WRITE_FLAGS: Readonly<Record<string, RegExp>> = { rg: /^--pre(=|$)/, tree: /^-o/, file: /^(-C|--compile)$/ };

const WORKTREE_DIR = ".worktrees";
const DELETE_ROOTS = new Set(["rm", "rmdir", "Remove-Item", "ri"]);
const NPM_FAMILY = ["npm", "yarn", "pnpm"];
const GIT_GLOBALS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);
const SED_QUIET_FLAGS = ["-n", "--quiet", "--silent"];
const SED_GENERAL_PRINT = /^(?:\d+(?:,(?:\d+|\$))?|\/[^/]*\/(?:,\/[^/]*\/)?)[p=]$/;
const SED_ADDRESS = String.raw`(\d+|\$|\/[^/]*\/)`;
const SED_SOURCE_PRINT = new RegExp(`^(${SED_ADDRESS}(,${SED_ADDRESS})?)?p$`);
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

function checkSed(tokens: Segment): Classification {
  const args = strings(tokens.slice(1));
  const flags = args.filter((a) => a.startsWith("-") && a !== "-");
  const rest = args.filter((a) => !a.startsWith("-") || a === "-");
  if (!flags.some((f) => SED_QUIET_FLAGS.includes(f))) return "unknown";
  if (flags.some((f) => !SED_QUIET_FLAGS.includes(f))) return "unknown";
  if (!rest.length) return "unknown";
  return SED_GENERAL_PRINT.test(rest[0]) ? "safe" : "unknown";
}

export function sedPrintOnly(seg: Segment): boolean {
  const args = seg.slice(1);
  if (!args.includes("-n")) return false;
  const scripts: (Token | undefined)[] = [];
  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (typeof t !== "string") return false;
    if (t === "-n") continue;
    if (t === "-e") scripts.push(args[++i]);
    else if (t.startsWith("-")) return false;
    else files.push(t);
  }
  if (!scripts.length) scripts.push(files.shift());
  return scripts.every((s) => typeof s === "string" && SED_SOURCE_PRINT.test(s));
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

function checkFind(tokens: Segment): Classification {
  const runsOrDeletes = tokens.some((t) => typeof t === "string" && /^-(exec|execdir|ok|okdir|delete)$/.test(t));
  return runsOrDeletes ? "unknown" : "safe";
}

export function classifySegment(tokens: Segment, scope: SegmentScope): Classification {
  if (!tokens.length) return "unknown";
  if (tokens[0] === BARE_KERNEL && !wrappedCommands(tokens).length) return classifyKernelCall(tokens, scope);
  const root = normalizeRoot(tokens[0]);
  if (typeof root !== "string") return "unknown";
  if (root === "sed") return checkSed(tokens);
  if (root === "git") return checkGit(tokens);
  if (root === "dotnet") return checkDotnet(tokens);
  if (NPM_FAMILY.includes(root)) return checkNpmFamily(tokens, scope);
  if (DELETE_ROOTS.has(root) && isWorktreeTeardown(tokens)) return "unknown";
  if (DENY_ROOTS.has(root)) return "deny";
  if (META_ROOTS.has(root)) return "unknown";
  if (root === "find") return checkFind(tokens);
  return SAFE_ROOTS.has(root) ? "safe" : "unknown";
}
