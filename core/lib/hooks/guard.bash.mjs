#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for the Bash tool.
 *
 * Goal: replace giant string-prefix allowlists with real evaluation of the
 * command, so that:
 *   - compound commands (a && b, a | b, a ; b) are checked per sub-command
 *   - quoted strings containing ; or | etc. are NOT mistaken for chaining
 *   - command substitution ($(...), `...`), eval, xargs->sh -c, and other
 *     "commands hidden inside commands" are treated as needing a real
 *     prompt instead of being silently allowed or silently trusted
 *
 * This is intentionally conservative: anything it isn't confident about
 * falls through to Claude Code's normal permission prompt (exit code 0,
 * no decision). It only actively ALLOWS things it recognizes as safe,
 * and only actively DENIES things it recognizes as destructive.
 *
 * Wire it up in settings.json (exec form + ${CLAUDE_PROJECT_DIR} so the
 * script resolves regardless of the hook's spawn cwd):
 *   "hooks": {
 *     "PreToolUse": [
 *       { "matcher": "Bash",
 *         "hooks": [{ "type": "command", "command": "node",
 *                     "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.bash.mjs"] }] }
 *     ]
 *   }
 *
 * NOTE: the exact PreToolUse hook I/O contract (field names like
 * hookSpecificOutput / permissionDecision) has been iterated on by
 * Anthropic. Verify this still matches the current docs before relying
 * on it in a real workflow: https://docs.claude.com/en/docs/claude-code/hooks
 */

import { appendFileSync, mkdirSync, readFileSync } from "fs";
import { homedir } from "os";
import { isAbsolute, join, resolve } from "path";
import { sourceRoots, underSource } from "../source-paths.mjs";
import { stateDir, statePath, stateRel, STATE_FILES } from "../paths.mjs";
import { kernelVerbStart, normalizeRoot } from "../kernel-call.mjs";
import { maskEnvValues, openWorkItem } from "./observe.drive.mjs";
import { detectTooling } from "../tooling.mjs";
import { bareAgentName } from "../agent-name.mjs";
import { ASKING_MODES, carriesMarker, commandKey, escalationMarker, leadingAssignments, notRunBefore, recordEscalation, withoutMarker } from "../escalation.mjs";
import { readLedger } from "../cost.mjs";
import { escalationAllowRules } from "../saved-rules.mjs";

const TRACED_COMMAND_CHARS = 300;

function trace(root, rawCommand, outcome) {
  try {
    mkdirSync(stateDir(root), { recursive: true });
    appendFileSync(
      statePath(root, STATE_FILES.guardLog),
      JSON.stringify({
        ts: new Date().toISOString(),
        outcome,
        cwd: process.cwd(),
        command: maskEnvValues(rawCommand).slice(0, TRACED_COMMAND_CHARS),
      }) + "\n"
    );
  } catch {}
}

async function loadTokenizer() {
  try {
    return (await import("../vendor/shell-quote-parse.mjs")).parse;
  } catch {
    return null;
  }
}

const parse = await loadTokenizer();

// ---------------------------------------------------------------------
// Configuration - tune this to your project.
// ---------------------------------------------------------------------

// Command roots that are always safe to auto-approve, regardless of args,
// as long as they appear as a stand-alone segment (not fed through a
// meta-command like xargs/eval/sh -c).
const SAFE_ROOTS = new Set([
  "cd", "pwd", "ls", "dir", "cat", "head", "tail", "wc", "tree", "stat",
  "file", "diff", "echo", "printf", "find", "grep", "rg", "which",
  "Get-ChildItem", "Select-String", "Select-Object", "Sort-Object",
  "Measure-Object",
  // JS/TS project tooling - local dev binaries invoked directly.
  // These lint/typecheck/build/test using project config; they don't
  // touch the network or publish anything by themselves.
  "tsc", "eslint", "prettier", "jest", "vitest", "mocha", "cypress",
  "webpack", "rollup", "esbuild", "vite", "next", "react-scripts",
  "babel", "playwright",
]);

// git subcommands considered read-only / inspection.
const SAFE_GIT_SUBCOMMANDS = new Set([
  "status", "log", "diff", "show", "blame", "branch", "remote", "tag",
  "ls-files", "ls-tree", "rev-parse", "describe", "shortlog", "reflog",
  "stash", // "git stash list" is safe; "git stash drop/pop" is not - handled below
  "config",
]);

// git subcommands that are destructive / state-changing - always deny.
const DENY_GIT_SUBCOMMANDS = new Set([
  "push", "reset", "rebase", "checkout", "merge", "clean", "branch",
  // note: "branch" appears in both lists deliberately - see checkGit()
]);

// Non-git command roots that are always destructive - always deny.
const DENY_ROOTS = new Set([
  "sudo", "rm", "rmdir", "chmod", "chown", "chgrp", "dd", "mkfs",
  "shutdown", "reboot", "kill", "killall", "del", "erase",
  "Remove-Item", "ri",
]);

// Roots that execute another command supplied as an argument/string.
// These are the classic ways to smuggle an unsafe action past a naive
// prefix-matcher (xargs ... sh -c "...", eval "...", find -exec, etc).
// We do NOT try to recursively parse what's inside - we just refuse to
// auto-allow them, so a human sees the real command.
const META_ROOTS = new Set([
  "xargs", "eval", "sh", "bash", "zsh", "ksh", "dash", "env", "nohup",
  "timeout", "watch", "perl", "python", "python3", "node", "ruby",
  "powershell", "powershell.exe", "cmd", "cmd.exe", "pwsh",
  // JS runtimes/executors that run arbitrary code by design.
  "npx", "ts-node", "tsx", "deno", "bun",
]);

// The directory name under which the `branching` skill parks per-feature
// worktrees (`<repo>/.worktrees/<safe-branch-name>`). Deleting one of those
// directories is the sanctioned last step of a worktree teardown when git's
// own `worktree remove` refuses (see isWorktreeTeardown below).
const WORKTREE_DIR = ".worktrees";

// Redirection operators that write to disk - never auto-allow these,
// since "cat foo" is safe but "cat foo > important_file" is not.
const WRITE_REDIRECT_OPS = new Set([">", ">>"]);
const DISCARD_TARGET = "/dev/null";

const LOG_SINK_DIR = stateRel("");

function isSanctionedLogSink(target) {
  if (typeof target !== "string" || !target) return false;
  const norm = target.split("\\").join("/");
  if (norm.includes("..")) return false;
  if (/[*?$`~]/.test(norm)) return false; // glob or expansion - not a literal path
  if (!norm.toLowerCase().endsWith(".log")) return false;
  const dir = norm.slice(0, norm.lastIndexOf("/"));
  return dir.toLowerCase().endsWith(LOG_SINK_DIR);
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function outcomes(root, rawCommand) {
  function decide(decision, reason) {
    trace(root, rawCommand, decision);
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    };
  }

  function fallThrough(reason = "unspecified") {
    // No decision emitted -> Claude Code applies its normal permission
    // rules / prompts the user as usual.
    trace(root, rawCommand, `fallthrough:${reason}`);
    return null;
  }

  return { decide, fallThrough };
}

/**
 * Raw-text pre-checks for constructs shell-quote doesn't turn into a
 * clean operator we can reason about (command substitution, process
 * substitution). These are exactly the kind of thing that let an
 * "innocent" looking command smuggle something dangerous.
 */
function hasHiddenExecution(rawCommand) {
  return (
    /\$\(/.test(rawCommand) || // $(...)
    /`/.test(rawCommand) ||    // `...`
    /<\(/.test(rawCommand) ||  // <(...)
    />\(/.test(rawCommand)     // >(...)
  );
}

const HEREDOC_START = /^<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;&|<>()'"`\\]+)(?=[\s;&|<>()]|$))/;
const WORD_BREAK = /[\s;&|()]/;

function quotedEnd(raw, i) {
  const ansi = raw[i] === "$";
  const quote = raw[ansi ? i + 1 : i];
  const escapes = ansi || quote === '"';
  for (let j = ansi ? i + 2 : i + 1; j < raw.length; j++) {
    if (escapes && raw[j] === "\\") j++;
    else if (raw[j] === quote) return j + 1;
  }
  return raw.length;
}

function readHeredocBody(raw, start, { delimiter, stripTabs }) {
  for (let i = start; i < raw.length; ) {
    const end = raw.indexOf("\n", i);
    const next = end === -1 ? raw.length : end + 1;
    const line = raw.slice(i, end === -1 ? raw.length : end);
    if ((stripTabs ? line.replace(/^\t+/, "") : line) === delimiter) return { body: raw.slice(start, i), next };
    i = next;
  }
  return null;
}

function shellText(raw) {
  let command = "";
  let expanded = "";
  const pending = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "'" || ch === '"' || (ch === "$" && raw[i + 1] === "'")) {
      const end = quotedEnd(raw, i);
      command += raw.slice(i, end);
      i = end;
    } else if (ch === "\\") {
      if (raw[i + 1] !== "\n") command += raw.slice(i, i + 2);
      i += 2;
    } else if (ch === "#" && (i === 0 || WORD_BREAK.test(raw[i - 1]))) {
      const end = raw.indexOf("\n", i);
      i = end === -1 ? raw.length : end;
    } else if (raw.startsWith("<<<", i)) {
      command += "<<<";
      i += 3;
    } else if (raw.startsWith("<<", i) && HEREDOC_START.test(raw.slice(i))) {
      const [token, dash, single, double, bare] = HEREDOC_START.exec(raw.slice(i));
      pending.push({ delimiter: single ?? double ?? bare, stripTabs: dash === "-", expands: bare !== undefined && !token.includes("\\") });
      command += token;
      i += token.length;
    } else if (raw.startsWith("&>", i) && !/[&>]/.test(raw[i - 1] ?? "")) {
      const append = raw[i + 2] === ">";
      command += append ? ">>" : ">";
      i += append ? 3 : 2;
    } else if (ch === "\n") {
      command += " ; ";
      i++;
      for (const heredoc of pending.splice(0)) {
        const read = readHeredocBody(raw, i, heredoc);
        if (!read) return null;
        if (heredoc.expands) expanded += read.body;
        i = read.next;
      }
    } else {
      command += ch;
      i++;
    }
  }
  return pending.length ? null : { command, expanded };
}

const SUBSTITUTION_WORD = "__picket_substitution__";
const MAX_SUBSTITUTION_DEPTH = 2;
const INERT_ROOTS = new Set(["cat", "head", "tail", "wc", "ls", "dir", "grep", "echo", "printf", "stat", "diff", "pwd"]);

function opensSingleQuote(command, i) {
  return command[i] === "'" || command.startsWith("$'", i);
}

function outsideSingleQuotes(command) {
  let out = "";
  let inDouble = false;
  for (let i = 0; i < command.length; ) {
    if (command[i] === "\\") {
      out += command.slice(i, i + 2);
      i += 2;
    } else if (!inDouble && opensSingleQuote(command, i)) {
      i = quotedEnd(command, i);
    } else {
      if (command[i] === '"') inDouble = !inDouble;
      out += command[i++];
    }
  }
  return out;
}

const PLAIN_PARAMETER_CHAR = /^[A-Za-z0-9_:\-./+= ]$/;

function hasOpaqueQuotedParameter(command) {
  let inDouble = false;
  for (let i = 0; i < command.length; i++) {
    if (command[i] === "\\") i++;
    else if (!inDouble && opensSingleQuote(command, i)) i = quotedEnd(command, i) - 1;
    else if (command[i] === '"') inDouble = !inDouble;
    else if (inDouble && command.startsWith("${", i)) {
      const close = plainParameterEnd(command, i + 2);
      if (close < 0) return true;
      i = close;
    }
  }
  return false;
}

function plainParameterEnd(command, start) {
  for (let i = start; i < command.length; i++) {
    if (command[i] === "}") return i;
    if (command.startsWith("${", i)) {
      const close = plainParameterEnd(command, i + 2);
      if (close < 0) return -1;
      i = close;
    } else if (!PLAIN_PARAMETER_CHAR.test(command[i])) return -1;
  }
  return -1;
}

function closingParen(command, start) {
  let open = 1;
  for (let i = start; i < command.length; i++) {
    const ch = command[i];
    if (ch === "\\") i++;
    else if (ch === '"' || opensSingleQuote(command, i)) i = quotedEnd(command, i) - 1;
    else if (ch === "(") open++;
    else if (ch === ")" && --open === 0) return i;
  }
  return -1;
}

function evaluateSubstitution(command, start, ctx) {
  const close = closingParen(command, start + 2);
  if (close === -1) return null;
  const body = command.slice(start + 2, close);
  return { body, close, result: evaluateCommand(body, { ...ctx, depth: ctx.depth + 1 }) };
}

function substituteCommands(command, ctx) {
  const bodies = [];
  if (ctx.depth >= MAX_SUBSTITUTION_DEPTH) return { command, bodies };
  let out = "";
  let inDouble = false;
  for (let i = 0; i < command.length; ) {
    if (command[i] === "\\") {
      out += command.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (!inDouble && opensSingleQuote(command, i)) {
      const end = quotedEnd(command, i);
      out += command.slice(i, end);
      i = end;
      continue;
    }
    const substitution = command.startsWith("$(", i) && command[i + 2] !== "(" ? evaluateSubstitution(command, i, ctx) : null;
    if (substitution?.result.decision === "deny") return { command, bodies, denial: substitution.result };
    if (substitution?.result.decision === "allow") {
      bodies.push(substitution.body);
      out += SUBSTITUTION_WORD;
      i = substitution.close + 1;
      continue;
    }
    if (command[i] === '"') inDouble = !inDouble;
    out += command[i++];
  }
  return { command: out, bodies };
}

function recheckBodies(bodies, cwd, ctx) {
  if (!cwd) return fallThrough("hidden-execution");
  for (const body of bodies) {
    const result = evaluateCommand(body, { ...ctx, cwd, depth: ctx.depth + 1 });
    if (result.decision !== "allow") return result;
  }
  return null;
}

function carriesSubstitution(token) {
  return typeof token === "string" && token.includes(SUBSTITUTION_WORD);
}

const VARIABLE_MARK = "__picket_variable__";
const MARKED_NAME = new RegExp(`${VARIABLE_MARK}(.*?)${VARIABLE_MARK}`, "g");
const PLAIN_NAME = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[?#$!@*-])$/;
const ASSIGNMENT_IN_TEXT = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g;
const LAST_ARGUMENT = "_";
const SHELL_BEHAVIOUR_NAMES = new Set(["PATH", "CDPATH", "IFS", "BASH_ENV", "ENV", "GLOBIGNORE", "HOME", "SHELLOPTS", "BASHOPTS", "PS4"]);

function markVariable(name) {
  return name ? `${VARIABLE_MARK}${name}${VARIABLE_MARK}` : undefined;
}

function markedNames(token) {
  return typeof token === "string" ? [...token.matchAll(MARKED_NAME)].map((match) => match[1]) : [];
}

function carriesVariable(token) {
  return typeof token === "string" && token.includes(VARIABLE_MARK);
}

function outputCarrier(taintedNames) {
  return (token) => carriesSubstitution(token) || markedNames(token).some((name) => taintedNames.has(name) || !PLAIN_NAME.test(name));
}

function namesAssignedAnywhere(command) {
  return [...command.matchAll(ASSIGNMENT_IN_TEXT)].map((match) => match[1]);
}

function classifyAssignment(names) {
  return names.some((name) => SHELL_BEHAVIOUR_NAMES.has(name) || process.env[name] !== undefined) ? "unknown" : "safe";
}

function classifyPrefixedCommand(commandClass) {
  return commandClass === "deny" ? "deny" : "unknown";
}

function withSubstitutedOutput(seg, plain, carriesOutput) {
  if (plain === "deny" || !seg.some(carriesOutput)) return plain;
  if (carriesOutput(seg[0])) return "unknown";
  return plain === "safe" && INERT_ROOTS.has(normalizeRoot(seg[0])) ? "safe" : "unknown";
}

// Flags of the kernel CLI whose value is a shell command the kernel will execute.
export const WRAPPING_FLAGS = new Set(["--run", "--start", "--only"]);
const BARE_KERNEL = "picket";
export const KERNEL_READ_VERBS = new Set(["state", "next", "packet", "list", "review-summary", "cost", "preflight", "extensions", "admit", "find-verdict", "verify"]);
export const KERNEL_OTHER_VERBS = new Set(["init", "extension", "new", "set", "close", "route", "drive", "comment", "pr", "migrate", "check", "source"]);
export const KERNEL_READ_SUBVERBS = { source: ["find", "grep"] };

function wrappedCommands(seg) {
  const start = kernelVerbStart(seg);
  if (start === null) return [];
  const out = [];
  for (let i = start; i < seg.length; i++) {
    if (WRAPPING_FLAGS.has(seg[i]) && typeof seg[i + 1] === "string") out.push(seg[++i]);
  }
  return out;
}

/**
 * Split a shell-quote token stream into segments at chaining/piping
 * operators. Subshell grouping parens are dropped (treated as
 * transparent) rather than fully modeled - good enough to stop
 * `(cd /tmp && rm -rf *)` from being misread as one opaque blob, while
 * staying simple.
 */
function splitIntoSegments(tokens) {
  const CHAIN_OPS = new Set(["&&", "||", ";", "|", "|&", ";;"]);
  const segments = [];
  let current = [];
  let sawWriteRedirect = false;
  let sawBackground = false;
  const redirectTargets = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (typeof tok === "object" && tok.op) {
      if (tok.op === "(" || tok.op === ")") {
        continue; // transparent grouping
      }
      if (tok.op === ">&") {
        // "2>&1" (fd duplication) is harmless stream plumbing; ">& file"
        // writes both streams to disk and must not be silently allowed.
        const next = tokens[i + 1];
        if (typeof next === "string" && /^\d+$/.test(next)) {
          i++; // swallow the fd number so it doesn't pollute segment args
        } else if (next === DISCARD_TARGET) {
          i++;
        } else {
          sawWriteRedirect = true;
          if (typeof next === "string") {
            redirectTargets.push(next);
            i++; // the target is a filename, not an argument to the command
          } else {
            redirectTargets.push(null); // unresolvable target - never sanctioned
          }
        }
        continue;
      }
      if (tok.op === "&") {
        // backgrounding a process - deserves a human look, not silent allow
        sawBackground = true;
        if (current.length) segments.push(current);
        current = [];
        continue;
      }
      if (WRITE_REDIRECT_OPS.has(tok.op)) {
        const target = tokens[i + 1];
        if (target === DISCARD_TARGET) {
          i++;
          continue;
        }
        sawWriteRedirect = true;
        if (typeof target === "string") {
          redirectTargets.push(target);
          i++; // the target is a filename, not an argument to the command
        } else {
          redirectTargets.push(null); // unresolvable target - never sanctioned
        }
        continue;
      }
      if (CHAIN_OPS.has(tok.op)) {
        if (current.length) segments.push(current);
        current = [];
        continue;
      }
      // glob or other op we don't specifically handle - ignore
      continue;
    }
    current.push(tok);
  }
  if (current.length) segments.push(current);
  return { segments, sawWriteRedirect, sawBackground, redirectTargets };
}

/**
 * Drop git's leading GLOBAL options so the subcommand is always at index 1.
 *
 * Without this, `git -C <repo> status` classified on the token "-C" and fell
 * through to a prompt, while `git -C <repo> push` missed the deny list
 * entirely — the guard read the option, not the verb. Any tool driving nested
 * repos (the `branching` skill runs every command as `git -C <repo> …`) hits
 * this on every call, so normalize once here rather than at each call site.
 *
 * Returns a token array shaped `["git", <subcommand>, ...args]`.
 */
function stripGitGlobalOpts(tokens) {
  const TAKES_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);
  const rest = tokens.slice(1);
  let i = 0;
  while (i < rest.length) {
    const t = rest[i];
    if (typeof t !== "string" || !t.startsWith("-")) break;
    // "--git-dir=<path>" carries its value inline; "-C <path>" consumes the next token.
    if (t.includes("=")) { i += 1; continue; }
    i += TAKES_VALUE.has(t) ? 2 : 1;
  }
  return ["git", ...rest.slice(i)];
}

function checkGit(rawTokens) {
  const tokens = stripGitGlobalOpts(rawTokens);
  const sub = tokens[1];
  if (sub === "stash") {
    const action = tokens[2];
    if (action === "list") return "safe";
    // Bare "git stash" IS "git stash push" — a working-tree mutation — and
    // push/pop/drop/clear all mutate. "unknown" (prompt), NOT "deny": the
    // developer agent's sanctioned pre-existing-failure stash dance
    // (git stash --include-untracked && <test> && git stash pop) must stay
    // approvable by the user / settings rather than hard-blocked here.
    return "unknown";
  }
  if (sub === "branch") {
    // "-d/-D/-m/-M" = delete/move → deny. A positional arg with no flag
    // ("git branch foo") CREATES a branch → mutation → prompt. Only bare
    // "git branch" / flag-only inspection forms ("--list", "-a", "-v") are safe.
    const hasDeleteOrMove = tokens.some(
      (t) => typeof t === "string" && /^-[a-zA-Z]*[DdMm]/.test(t)
    );
    if (hasDeleteOrMove) return "deny";
    const hasPositionalArg = tokens
      .slice(2)
      .some((t) => typeof t === "string" && !t.startsWith("-"));
    return hasPositionalArg ? "unknown" : "safe";
  }
  if (sub === "config") {
    const hasWriteFlag = tokens.some(
      (t) => t === "--global" || t === "--unset" || t === "--add"
    );
    // "git config --get" / "--list" are read-only; bare "git config x y"
    // sets a value - be conservative and only allow clear read patterns.
    const looksReadOnly = tokens.some((t) => t === "--get" || t === "--list");
    return looksReadOnly && !hasWriteFlag ? "safe" : "deny";
  }
  if (sub === "worktree") {
    // "worktree list" is pure inspection and the branching skill runs it once
    // per mapped repo on EVERY invocation (manifest validation + resume check)
    // — leaving it to the prompt taxes the common read path. add / remove /
    // prune / move / lock / repair all mutate registrations: prompt, never
    // auto-allow, and never hard-deny (teardown is a legitimate operation).
    return tokens[2] === "list" ? "safe" : "unknown";
  }
  if (sub === "submodule") {
    // status/summary inspect; init/update/deinit/foreach mutate working trees
    // or run arbitrary commands.
    return ["status", "summary"].includes(tokens[2]) ? "safe" : "unknown";
  }
  if (DENY_GIT_SUBCOMMANDS.has(sub)) return "deny";
  if (SAFE_GIT_SUBCOMMANDS.has(sub)) return "safe";
  return "unknown";
}

/**
 * Narrow carve-out for the one deletion this workflow legitimately needs:
 * tearing down a per-feature worktree directory when `git worktree remove`
 * refuses even with `--force`. (The common submodule case does NOT need this
 * rung: git's guard trips on the worktree's own `modules/` dir, which
 * `git submodule deinit` leaves behind — so rung 1 refuses — but `--force`
 * clears it. See the branching skill's removal ladder.) With `rm` hard-denied
 * there was no legal route at all, which pushed the agent toward either
 * dirtying the branch index (`git rm --cached`) or reaching for another
 * deletion tool to get around the guard. Both are worse than a prompt.
 *
 * Returns true only when EVERY operand is a path with a `.worktrees/<name>`
 * segment and at least one segment after `.worktrees` — so the worktree
 * directory itself is deletable, while the `.worktrees` parent, the repo,
 * and anything outside are not. Result is "unknown", NOT "allow": the user
 * still sees the prompt (settings.json already lists `Bash(rm *)` under
 * `ask`). This only stops the hard deny from pre-empting that prompt.
 *
 * Windows paths must be QUOTED to qualify: in an unquoted token the shell
 * tokenizer eats `\` as an escape, so the separators — and with them any
 * proof of scope — are gone by the time we see the operand. Failing closed
 * (deny) there is deliberate.
 */
function isWorktreeTeardown(tokens) {
  const operands = tokens.slice(1).filter(
    (t) => typeof t === "string" && !t.startsWith("-")
  );
  if (!operands.length) return false; // e.g. globbed away by the tokenizer
  return operands.every((raw) => {
    if (/[*?]/.test(raw)) return false; // wildcards: scope isn't statically known
    const segs = raw.replace(/\\/g, "/").split("/");
    if (segs.includes("..")) return false; // no climbing back out
    const i = segs.indexOf(WORKTREE_DIR);
    if (i === -1) return false;
    const rest = segs.slice(i + 1).filter((s) => s !== "" && s !== ".");
    return rest.length >= 1; // must name a worktree, not the parent dir
  });
}

/**
 * dotnet CLI.
 *
 * Safe: build / test / restore / clean / list / sln list / --version /
 *       --info / --list-sdks / --list-runtimes / nuget (read-only ops).
 * Unknown (falls through to a prompt): run / watch (executes your
 *       project's own code - could do anything the app can do), publish,
 *       pack, add / remove / new / sln add|remove (mutate project files
 *       or restructure the solution), tool install/uninstall/update,
 *       format without --verify-no-changes (rewrites source files).
 * Deny: nuget push / nuget delete (publishes/removes a package remotely).
 */
/**
 * `sed` cannot be a safe root: `-i` rewrites a file in place, and a `w` command
 * inside a script writes one even without it. But in auto mode the harness
 * drives file reads through the shell (`sed -n '1,80p' <file>`), which made sed
 * the single largest group of commands this guard could not classify, each one
 * costing a permission prompt to read a file.
 *
 * So recognise the print-only form and nothing else: `-n` must be present, the
 * script must be a range or pattern ending in `p`, and any other flag or script
 * shape stays "unknown" and reaches the human. A whitelist, not a blacklist —
 * `s///w out`, `-i`, `e` and the rest all fail to match rather than needing to
 * be enumerated.
 */
function checkSed(tokens) {
  const args = tokens.slice(1).filter((t) => typeof t === "string");
  const flags = args.filter((a) => a.startsWith("-") && a !== "-");
  const rest = args.filter((a) => !a.startsWith("-") || a === "-");

  if (!flags.includes("-n") && !flags.includes("--quiet") && !flags.includes("--silent"))
    return "unknown";
  if (flags.some((f) => !["-n", "--quiet", "--silent"].includes(f))) return "unknown";
  if (!rest.length) return "unknown";

  // Print-only scripts: line ranges (`1,80p`, `370p`, `12,$p`) and regex
  // ranges (`/from/,/to/p`, `/only/p`). `=` prints line numbers and is equally
  // read-only.
  const PRINT_ONLY =
    /^(?:\d+(?:,(?:\d+|\$))?|\/[^/]*\/(?:,\/[^/]*\/)?)[p=]$/;
  if (!PRINT_ONLY.test(rest[0])) return "unknown";

  return "safe";
}

function checkDotnet(tokens) {
  const sub = tokens[1];

  if (sub === "nuget") {
    const action = tokens[2];
    if (action === "push" || action === "delete") return "deny";
    return "safe"; // locals, list, etc.
  }

  if (sub === "format") {
    const verifyOnly = tokens.some((t) => t === "--verify-no-changes");
    return verifyOnly ? "safe" : "unknown"; // otherwise it rewrites files
  }

  if (sub === "sln") {
    const action = tokens[2];
    return action === "list" ? "safe" : "unknown"; // add/remove mutate
  }

  if (sub === "tool") {
    const action = tokens[2];
    if (["install", "uninstall", "update"].includes(action)) return "unknown";
    return "safe"; // "dotnet tool list"
  }

  const SAFE_SUB = new Set([
    "build", "test", "restore", "clean", "list",
    "--version", "--info", "--list-sdks", "--list-runtimes",
  ]);
  if (SAFE_SUB.has(sub)) return "safe";

  // run, watch, publish, pack, add, remove, new, and anything unrecognized
  // execute arbitrary project code or mutate the project - don't guess.
  return "unknown";
}

/**
 * Read package.json in the working directory (best-effort) and return
 * the raw string for scripts[name], or null if unavailable.
 */
function readPackageScript(scriptName, cwd) {
  try {
    if (!cwd) return null; // effective cwd not statically known
    const raw = readFileSync(join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    return pkg?.scripts?.[scriptName] ?? null;
  } catch {
    return null; // no package.json, unreadable, or no such script
  }
}

/**
 * Resolve what "npm run <script>" (or its aliases) actually executes by
 * reading package.json, then recursively classify THAT command instead
 * of trusting the script name. Falls back to "unknown" if we can't read
 * or fully resolve it - never silently trusts a script we can't see.
 */
function resolvePackageScript(scriptName, cwd, depth = 0) {
  if (!scriptName || depth > 3) return "unknown"; // guard against cycles
  const scriptBody = readPackageScript(scriptName, cwd);
  if (!scriptBody) return "unknown";
  return classifyCommandText(scriptBody, cwd, depth);
}

function classifyCommandText(text, cwd, depth) {
  let innerTokens;
  try {
    innerTokens = parse(text);
  } catch {
    return "unknown";
  }
  if (hasHiddenExecution(text)) return "unknown";

  const { segments, sawWriteRedirect, sawBackground } = splitIntoSegments(innerTokens);
  if (!segments.length) return "unknown";
  if (sawWriteRedirect || sawBackground) return "unknown";

  const results = segments.map((seg) => classifySegment(seg, cwd, depth + 1));
  if (results.includes("deny")) return "deny";
  if (results.every((r) => r === "safe")) return "safe";
  return "unknown";
}

/**
 * npm / yarn / pnpm.
 *
 * Safe: list / outdated / view / why / audit (report only) /
 *       config get|list (read-only local ops).
 * Deny: publish / unpublish / deprecate / owner / adduser / login /
 *       logout / token (touches the remote registry or credentials).
 * Unknown: install / ci / pack (write node_modules/lockfile/tarball and
 *       run lifecycle scripts), exec / dlx / link / npx-equivalents
 *       (run arbitrary binaries), audit fix, config set, and
 *       "run <script>" / "test" / "start" / "build" - UNLESS
 *       package.json resolution shows the underlying command is
 *       itself fully safe.
 */
function checkNpmFamily(tokens, cwd) {
  const sub = tokens[1];

  const DENY_SUB = new Set([
    "publish", "unpublish", "deprecate", "owner", "adduser",
    "login", "logout", "token",
  ]);
  if (DENY_SUB.has(sub)) return "deny";

  if (sub === "audit") {
    return tokens[2] === "fix" ? "unknown" : "safe";
  }

  if (sub === "config") {
    return ["get", "list", "ls"].includes(tokens[2]) ? "safe" : "unknown";
  }

  const READ_SAFE_SUB = new Set([
    "list", "ls", "outdated", "view", "why", "--version", "-v",
  ]);
  if (READ_SAFE_SUB.has(sub)) return "safe";

  // install/ci write node_modules + lockfile AND run arbitrary lifecycle
  // scripts (postinstall) — an execution vector, not a read. pack writes a
  // tarball. All deserve the normal prompt, not a silent allow.
  if (["install", "i", "ci", "pack"].includes(sub)) return "unknown";

  if (["exec", "dlx", "link"].includes(sub)) return "unknown"; // arbitrary binaries

  const SCRIPT_ALIASES = new Set(["run", "run-script", "test", "start", "build"]);
  if (SCRIPT_ALIASES.has(sub)) {
    const scriptName = sub === "run" || sub === "run-script" ? tokens[2] : sub;
    return resolvePackageScript(scriptName, cwd);
  }

  // Bare "yarn <script>" (yarn allows omitting "run").
  if (sub !== undefined) {
    return resolvePackageScript(sub, cwd);
  }

  return "unknown";
}

/**
 * Track the effective working directory across segments so that
 * "cd <path> && npm run x" resolves package.json from <path>, not the
 * session cwd. Returns the new cwd, or null when the target can't be
 * determined statically (bare "cd", "cd -", multiple args) — a null cwd
 * makes package-script resolution fail closed to "unknown".
 */
function applyCd(seg, currentCwd) {
  if (seg.length !== 2 || typeof seg[1] !== "string") return null;
  if (seg[1] === "-" || carriesVariable(seg[1])) return null;
  return currentCwd ? resolve(currentCwd, nodePath(seg[1])) : null;
}

/** Git-Bash / MSYS drive paths: /c/foo -> c:/foo so Node can resolve them. */
function nodePath(p) {
  const msys = /^\/([A-Za-z])(\/|$)/.exec(p);
  return msys ? `${msys[1]}:${p.slice(2) || "/"}` : p;
}

// A segment that acts inside a source (D-008 r3) is judged by an allow-list alone, never by the
// general `safe` class: that class trusts `git tag`, `reflog`, `remote` and tools that write
// (`prettier --write`, `eslint --fix`). Anything not on the list is denied, never prompted.
const SOURCE_READERS = new Set(["cd", "pwd", "cat", "head", "tail", "wc", "ls", "dir", "stat", "tree", "file", "diff", "grep", "rg", "Get-ChildItem", "Select-String"]);
const SOURCE_GIT_READS = new Set(["log", "show", "diff", "blame", "status", "ls-files", "ls-tree", "rev-parse", "grep", "cat-file"]);
const SOURCE_LISTING_FLAGS = new Set(["--list", "-l", "-a", "-r", "-v"]);
// The only git global options allowed: `-c`, `--config-env` and `--exec-path` can make a pager or alias run a command.
const SOURCE_GIT_GLOBALS = new Set(["-C", "--git-dir", "--work-tree", "--no-pager"]);
const FIND_ACTIONS = /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/;
// The few reader flags that write a file or run a command: `rg --pre`, `tree -o`, `file -C`.
const READER_WRITE_FLAGS = { rg: /^--pre(=|$)/, tree: /^-o/, file: /^(-C|--compile)$/ };
// A print-only sed script: `p` after an optional line or regex address range (`1,20p`, `/rate/p`).
const SED_ADDRESS = String.raw`(\d+|\$|\/[^/]*\/)`;
const SED_PRINT = new RegExp(`^(${SED_ADDRESS}(,${SED_ADDRESS})?)?p$`);

/** Git globals before the subcommand are only the allowed ones (and their values). */
function gitGlobalsAllowed(seg) {
  const globals = seg.slice(1, seg.length - (stripGitGlobalOpts(seg).length - 1));
  for (let i = 0; i < globals.length; i++) {
    const t = globals[i];
    if (typeof t !== "string") return false;
    const [name, inline] = t.split(/=(.*)/s);
    if (!SOURCE_GIT_GLOBALS.has(name)) return false;
    if (inline === undefined && name !== "--no-pager") i++; // `-C <path>` consumes its value
  }
  return true;
}

/** Git inside a source: the strict read-only list; also no `--output` (writes a file) or `grep -O` (opens a pager). */
function sourceGitAllowed(seg) {
  if (!gitGlobalsAllowed(seg)) return false;
  const [, sub, ...rest] = stripGitGlobalOpts(seg);
  const args = rest.filter((t) => typeof t === "string");
  if (args.some((t) => /^--output(=|$)/.test(t))) return false;
  if (sub === "grep" && args.some((t) => /^(-O|--open-files-in-pager)/.test(t))) return false;
  if (SOURCE_GIT_READS.has(sub)) return true;
  if (sub === "worktree") return args.length === 1 && args[0] === "list";
  if (sub === "branch" || sub === "tag") return args.every((t) => SOURCE_LISTING_FLAGS.has(t));
  return false;
}

/** `sed -n` whose every script only prints: no `-i`, no `w` or `e` command, no other flag. */
function sedPrintOnly(seg) {
  const args = seg.slice(1);
  if (!args.includes("-n")) return false;
  const scripts = [];
  const files = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (typeof t !== "string") return false;
    if (t === "-n") continue;
    if (t === "-e") scripts.push(args[++i]);
    else if (t.startsWith("-")) return false;
    else files.push(t);
  }
  if (!scripts.length) scripts.push(files.shift());
  return scripts.every((s) => typeof s === "string" && SED_PRINT.test(s));
}

/** Whether a segment that acts inside a source may run: on the allow-list, or denied. */
function sourceAllowed(seg) {
  const root = normalizeRoot(seg[0]);
  if (root === "git") return sourceGitAllowed(seg);
  if (root === "sed") return sedPrintOnly(seg);
  if (root === "find") return !seg.some((t) => typeof t === "string" && FIND_ACTIONS.test(t));
  const writesOrRuns = READER_WRITE_FLAGS[root];
  if (writesOrRuns && seg.some((t) => typeof t === "string" && writesOrRuns.test(t))) return false;
  return SOURCE_READERS.has(root);
}

/**
 * The source (a read-only repo, D-008) a segment would act inside: its effective cwd, or any
 * operand that resolves under one: `-C <path>`, `--work-tree=<path>`, a file argument.
 */
function segmentSource(seg, cwd, roots) {
  if (cwd) {
    const inCwd = underSource(cwd, roots);
    if (inCwd) return inCwd;
  }
  for (const tok of seg.slice(1)) {
    if (typeof tok !== "string" || !tok) continue;
    const value = nodePath(tok.match(/^--?[\w-]+=(.+)$/)?.[1] ?? tok);
    if (value.startsWith("-") || (!cwd && !isAbsolute(value))) continue;
    const hit = underSource(cwd ? resolve(cwd, value) : value, roots);
    if (hit) return hit;
  }
  return null;
}

/** A redirect target that lands in a source, resolved against every cwd the command passes through. */
function redirectSource(targets, cwds, roots) {
  for (const t of targets) {
    if (typeof t !== "string" || !t) continue;
    const p = nodePath(t);
    for (const cwd of isAbsolute(p) ? [null] : cwds.filter(Boolean)) {
      const hit = underSource(cwd ? resolve(cwd, p) : p, roots);
      if (hit) return hit;
    }
  }
  return null;
}

function sourceDenial(name, what) {
  return `guard.bash: ${what} acts inside source ${name}, which is read-only; read it through \`picket source\` and the snapshots, and never write, commit or run tools there.`;
}

/** Protected source worktrees for this project; [] when none, so the guard behaves as before. */
function protectedSources(root) {
  try {
    return sourceRoots(root);
  } catch {
    return [];
  }
}

function sameDirectory(a, b) {
  const norm = (dir) => resolve(dir).replaceAll("\\", "/").replace(/\/$/, "");
  return process.platform === "win32" ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

function verifyRunsNoProjectCode(tokens, cwd, hookRoot, depth) {
  const words = tokens.filter((t) => typeof t === "string");
  if (words.includes("--no-tests")) return true;
  if (!hookRoot || !cwd || !sameDirectory(cwd, hookRoot)) return false;
  if (words.some((t) => t === "--root" || t.startsWith("--root="))) return false;
  let testCommand;
  try {
    testCommand = detectTooling(hookRoot).test;
  } catch {
    return false;
  }
  return !testCommand || classifyCommandText(testCommand, hookRoot, depth) === "safe";
}

function classifyKernelCall(tokens, cwd, hookRoot, depth) {
  const [, verb, subverb] = tokens;
  if (verb === "verify") return verifyRunsNoProjectCode(tokens, cwd, hookRoot, depth) ? "safe" : "unknown";
  if (KERNEL_READ_VERBS.has(verb)) return "safe";
  if (Object.hasOwn(KERNEL_READ_SUBVERBS, verb) && KERNEL_READ_SUBVERBS[verb].includes(subverb)) return "safe";
  return "kernel";
}

function classifySegment(tokens, cwd = process.cwd(), depth = 0, hookRoot = null) {
  if (!tokens.length) return "unknown";
  if (tokens[0] === BARE_KERNEL && !wrappedCommands(tokens).length) return classifyKernelCall(tokens, cwd, hookRoot, depth);
  const root = normalizeRoot(tokens[0]);

  if (root === "sed") return checkSed(tokens);
  if (root === "git") return checkGit(tokens);
  if (root === "dotnet") return checkDotnet(tokens);
  if (["npm", "yarn", "pnpm"].includes(root)) return checkNpmFamily(tokens, cwd);

  const DELETE_ROOTS = new Set(["rm", "rmdir", "Remove-Item", "ri"]);
  if (DELETE_ROOTS.has(root) && isWorktreeTeardown(tokens)) return "unknown";

  if (DENY_ROOTS.has(root)) return "deny";
  if (META_ROOTS.has(root)) return "unknown"; // never silently allow these

  if (root === "find") {
    // find -exec / -execdir / -ok / -okdir run an arbitrary command per
    // result, and -delete destroys matches directly - all three make
    // "find" behave like a meta-command wearing a safe command's face.
    const isDestructive = tokens.some(
      (t) => typeof t === "string" && /^-(exec|execdir|ok|okdir|delete)$/.test(t)
    );
    return isDestructive ? "unknown" : "safe";
  }

  if (SAFE_ROOTS.has(root)) return "safe";

  return "unknown";
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

export function guardBash(input, { root, home = homedir() }) {
  const rawCommand = input?.tool_input?.command;
  if (typeof rawCommand !== "string" || !rawCommand.trim()) {
    return outcomes(root, "").fallThrough("no-command");
  }
  const outcome = outcomes(root, rawCommand);
  if (!parse) return outcome.fallThrough("no-tokenizer");

  // Claude Code's hook payload typically includes the session's working
  // directory - use it so package.json resolution looks in the right
  // place; fall back to this process's cwd if it's absent.
  const cwd = typeof input?.cwd === "string" ? input.cwd : process.cwd();

  const escalation = { mode: input?.permission_mode ?? null, session: input?.session_id ?? null, agent: bareAgentName(input?.agent_type), home };
  const { decision, reason } = evaluateCommand(rawCommand, { cwd, root, sources: protectedSources(root), depth: 0, escalation });
  return decision ? outcome.decide(decision, reason) : outcome.fallThrough(reason);
}

const decide = (decision, reason) => ({ decision, reason });
const fallThrough = (reason) => ({ decision: null, reason });

const ESCALATE_HINT = 'If the user asked for this action in this session or the work cannot continue without it, run it alone as `PICKET_ESCALATE="<why>" <command>` and the user decides in the dialog.';

function isOpaqueWord(value) {
  return value.includes(VARIABLE_MARK) || value.includes(SUBSTITUTION_WORD);
}

function readEscalation(segments, { hiddenExecution, sawWriteRedirect, sawBackground }) {
  if (segments.length !== 1 || hiddenExecution || sawWriteRedirect || sawBackground) return { shapeProblem: "escalate one command, alone", reason: null };
  const marker = escalationMarker(segments[0], { isOpaque: isOpaqueWord });
  return marker.invalid ? { shapeProblem: `escalate one command, alone: ${marker.invalid}`, reason: null } : { shapeProblem: null, reason: marker.reason };
}

function escalationVerdict({ shapeProblem, commandClass, mode, savedRules, refusedBefore }) {
  if (shapeProblem) return { outcome: "denied", why: "shape", cause: shapeProblem };
  if (commandClass !== "deny") return null;
  if (!ASKING_MODES.has(mode)) return { outcome: "denied", why: "mode", cause: `escalation is off in permission mode ${mode ?? "unknown"}, where the dialog is not proven` };
  if (savedRules.length) {
    const { rule, file } = savedRules[0];
    return { outcome: "denied", why: "saved_rule", cause: `the saved allow rule ${rule} in ${file} could approve it without a dialog; remove the rule` };
  }
  if (refusedBefore) return { outcome: "denied", why: "refused_before", cause: "the earlier ask for this command in this session did not run (refused, interrupted or failed), so it is not asked again" };
  return { outcome: "ask", why: null };
}

function judgeEscalation(rawCommand, segments, classifications, flags, ctx) {
  const { root, escalation } = ctx;
  const command = maskEnvValues(withoutMarker(rawCommand));
  const { shapeProblem, reason: rawReason } = readEscalation(segments, flags);
  const commandClass = classifications[0];
  const passedMode = !shapeProblem && commandClass === "deny" && ASKING_MODES.has(escalation.mode);
  const savedRules = passedMode ? escalationAllowRules({ root, home: escalation.home }) : [];
  const refusedBefore = passedMode && !savedRules.length && notRunBefore(readLedger(root), escalation.session, commandKey(command));
  const verdict = escalationVerdict({ shapeProblem, commandClass, mode: escalation.mode, savedRules, refusedBefore });
  if (!verdict) return fallThrough("escalation-not-destructive");
  const reason = rawReason === null ? null : maskEnvValues(rawReason);
  recordEscalation(root, { session: escalation.session, outcome: verdict.outcome, why: verdict.why, command, reason, agent: escalation.agent, work_id: openWorkItem(root).work_id });
  if (verdict.outcome === "ask") {
    return decide("ask", `guard.bash: escalation by ${escalation.agent ?? "main"}: "${reason}". Approving runs this one command once; nothing carries over.`);
  }
  return decide("deny", `guard.bash: ${verdict.cause}; run it yourself: ! ${command}`);
}

function evaluateCommand(command, ctx) {
  const { cwd, root, sources: roots, depth } = ctx;
  const text = shellText(command);
  if (!text) return fallThrough("unterminated-heredoc");
  if (text.command.includes(VARIABLE_MARK)) return fallThrough("variable-mark");
  if (hasOpaqueQuotedParameter(text.command)) return fallThrough("hidden-execution");
  const inheritedTaint = ctx.taintedNames ?? [];
  const bodyCtx = { ...ctx, taintedNames: [...inheritedTaint, ...namesAssignedAnywhere(text.command)] };
  const substituted = substituteCommands(text.command, bodyCtx);
  if (substituted.denial) return substituted.denial;
  const hiddenExecution = hasHiddenExecution(outsideSingleQuotes(substituted.command)) || hasHiddenExecution(text.expanded);

  let tokens;
  try {
    tokens = parse(substituted.command, markVariable);
  } catch {
    // Unparsable -> don't guess, let the normal prompt handle it.
    return fallThrough("unparsable");
  }

  const { segments, sawWriteRedirect, sawBackground, redirectTargets } =
    splitIntoSegments(tokens);

  if (!segments.length) return fallThrough("no-segments");

  const classifications = [];
  const cwdsSeen = [cwd];
  const taintedNames = new Set([LAST_ARGUMENT, ...inheritedTaint]);
  const carriesOutput = outputCarrier(taintedNames);
  let effCwd = cwd;
  for (const seg of segments) {
    const hit = roots.length ? segmentSource(seg, effCwd, roots) : null;
    if (hit && !sourceAllowed(seg)) return decide("deny", sourceDenial(hit, `\`${seg.filter((t) => typeof t === "string").join(" ").slice(0, 60)}\``));
    const unallowed = effCwd !== cwd && seg.some(carriesSubstitution) ? recheckBodies(substituted.bodies, effCwd, bodyCtx) : null;
    if (unallowed?.decision === "deny") return unallowed;
    const { assignments, command: commandPart } = leadingAssignments(seg);
    const prefixNames = assignments.map(({ name }) => name);
    const onlyAssignments = !commandPart.length;
    const plain = hit ? "safe" : classifySegment(commandPart, effCwd, 0, root);
    const judged = onlyAssignments
      ? classifyAssignment(prefixNames)
      : prefixNames.length
        ? classifyPrefixedCommand(plain)
        : withSubstitutedOutput(seg, plain, carriesOutput);
    classifications.push(unallowed ? "unknown" : judged);
    if (onlyAssignments) for (const name of prefixNames) taintedNames.add(name);
    if (normalizeRoot(seg[0]) === "cd") {
      effCwd = applyCd(seg, effCwd);
      cwdsSeen.push(effCwd);
    }
    for (const inner of wrappedCommands(seg)) {
      if (hasHiddenExecution(inner)) return fallThrough("wrapped-hidden-execution");
      const innerText = shellText(inner);
      if (!innerText) return fallThrough("wrapped-unparsable");
      let innerTokens;
      try {
        innerTokens = parse(innerText.command);
      } catch {
        return fallThrough("wrapped-unparsable");
      }
      const { segments: innerSegs, redirectTargets: innerTargets } = splitIntoSegments(innerTokens);
      if (innerSegs.some((s) => classifySegment(s, effCwd) === "deny")) {
        return decide("deny", `guard.bash: the command wrapped in a picket verb (${inner.slice(0, 60)}) contains a destructive sub-command; run it directly so the permission prompt sees it.`);
      }
      if (roots.length) {
        const hit = innerSegs.map((s) => (sourceAllowed(s) ? null : segmentSource(s, effCwd, roots))).find(Boolean) ?? redirectSource(innerTargets, [effCwd], roots);
        if (hit) return decide("deny", sourceDenial(hit, `the command wrapped in a picket verb (${inner.slice(0, 60)}); run it directly so the permission prompt sees it`));
      }
    }
  }

  // A write redirect into a source denies even behind a read-only command: `echo x > <source>/a.md`.
  if (roots.length && sawWriteRedirect) {
    const hit = redirectSource(redirectTargets, cwdsSeen, roots);
    if (hit) return decide("deny", sourceDenial(hit, "a write redirect"));
  }

  if (ctx.depth === 0 && ctx.escalation && segments.some(carriesMarker)) {
    return judgeEscalation(command, segments, classifications, { hiddenExecution, sawWriteRedirect, sawBackground }, ctx);
  }

  if (classifications.includes("deny")) {
    return decide(
      "deny",
      `guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset/rebase/checkout/merge/clean). ${ESCALATE_HINT}`
    );
  }

  if (hiddenExecution) {
    return fallThrough("hidden-execution"); // could be hiding anything
  }

  if (sawWriteRedirect) {
    // Every target must be the sanctioned log sink; one stray target and the
    // whole command goes to the human, since a chained command writes both.
    const hasVarExpansion = /\$(?!\?)/.test(command);
    const allSinks =
      !hasVarExpansion &&
      redirectTargets.length > 0 &&
      redirectTargets.every(isSanctionedLogSink);
    if (!allSinks) return fallThrough("write-redirect"); // writing to disk
  }

  if (sawBackground) {
    return fallThrough("background"); // backgrounded process
  }

  const inCompound = classifications.length > 1;
  if (classifications.every((c) => c === "safe" || (c === "kernel" && inCompound))) {
    return decide(
      "allow",
      `guard.bash: every sub-command is read-only/inspection or a bare picket call that wraps no command, with no hidden execution and no write redirection outside the sanctioned ${LOG_SINK_DIR} log sink.`
    );
  }

  // Mixed / unknown segments (including any META_ROOTS like xargs, sh -c,
  // eval, python -c, etc.) - don't guess, fall through to normal prompt.
  return fallThrough(`unknown-segments:[${classifications.join(",")}]`);
}
