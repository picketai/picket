#!/usr/bin/env node
// Log digest — turn a multi-thousand-line build/test/run log into ~40 lines of
// verdict, failures with file:line, and non-fatal warnings worth a look.
//
// Why a reader and not a runner. The problem is real: a `dotnet test` or `npm
// run build` log is thousands of lines, and dumping it into the developer's phase
// context crowds out the work. The reference harness this borrows from solves it
// with a subagent whose only job is to absorb the log — but that shape does not
// port here:
//
//   - Named teammates have no Agent tool (CLAUDE.md ## Agent base constraints),
//     and the developer is the agent with the noisy logs. Routing through the
//     team lead costs four SendMessage hops plus a whole agent spawn per command.
//   - A command WRAPPER (`run.mjs -- <cmd>`) would hide the real command from
//     guard.bash.mjs, which classifies exactly these — wrappers like xargs/eval/
//     sh -c are treated as hidden execution on purpose — and from
//     observe.bash.mjs's drive/inspect classification. Bypassing the security
//     classifier to save context is a bad trade.
//
// So this script NEVER executes anything. The agent redirects the command itself,
// keeping it fully visible to both hooks, then digests the file:
//
//     dotnet test > .claude/state/test.log 2>&1; echo "exit=$?"
//     node .claude/scripts/logdigest.mjs .claude/state/test.log
//
// Usage: logdigest.mjs <log-path> [--tail N] [--all-warnings]
import { readFileSync, statSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--"));
const tailN = Number(args[args.indexOf("--tail") + 1]) || 12;
const allWarnings = args.includes("--all-warnings");

if (!path || !existsSync(path)) {
  console.log(`logdigest: no log at ${path ?? "<missing argument>"}`);
  process.exit(0);
}

// Very large logs: read the head and the tail only. Compile errors cluster at the
// start, test failures and summaries at the end; the middle is progress noise.
const MAX = 8 * 1024 * 1024;
const size = statSync(path).size;
let text;
if (size > MAX) {
  const fd = readFileSync(path); // Buffer; slice without decoding the whole thing as one string
  text = fd.subarray(0, MAX / 2).toString("utf8") + "\n…[middle omitted]…\n" + fd.subarray(size - MAX / 2).toString("utf8");
} else {
  text = readFileSync(path, "utf8");
}
const lines = text.split(/\r?\n/);

const FAIL = [
  /\berror\s+[A-Z]{2}\d{3,}\b/i, // error CS0246 / TS2345 / CA1822
  /\b(FAILED|FAIL)\b/,
  /^\s*✗/,
  /\bFailed!/,
  /\bAssertionError\b/,
  /\bUnhandled exception\b/i,
  /^\s*panic:/,
  /^Traceback \(most recent call last\)/,
  /^npm ERR!/,
  /\b\d+ of \d+ checks failed\b/,
  /\berror\b\s*:/i,
];
const SUMMARY = [
  /\b(Passed|Failed)!\s*-?\s*Failed:/,
  /\bTests? run:/i,
  /\b\d+ (passed|failed|skipped)\b/i,
  /\b(All|Total)\s+\d+\s+(checks|tests)\b/i,
  /=+\s*\d+ (passed|failed).*=+/,
  /^exit=\d+$/,
];
const WARN = [/\bwarning\s+[A-Z]{2}\d{3,}\b/i, /^npm warn/i, /\bdeprecat/i, /^\s*⚠/, /\bchunk size\b/i, /\bexternalized for browser\b/i];
// Perennial noise no one can act on — the reference harness's triage rule.
const WARN_NOISE = [/npm fund/i, /funding/i, /peer dep/i, /^\s*$/];

const fileLine = (l) => {
  const m =
    /([\w./\\-]+\.\w+)\((\d+)(?:,\d+)?\)/.exec(l) || // MSBuild: Foo.cs(42,13)
    /([\w./\\-]+\.\w+):(\d+)(?::\d+)?/.exec(l); // gcc/node/pytest: foo.ts:42:9
  return m ? `${m[1]}:${m[2]}` : null;
};

const norm = (l) => l.trim().replace(/\s+/g, " ").slice(0, 220);
const collect = (pats, exclude = []) => {
  const seen = new Map();
  for (const l of lines) {
    if (!l.trim()) continue;
    if (!pats.some((re) => re.test(l))) continue;
    if (exclude.some((re) => re.test(l))) continue;
    const key = norm(l);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()];
};

const summaries = collect(SUMMARY);
// Summary lines are excluded from failures: "Failed! - Failed: 1, Passed: 599"
// matches both, and reporting it twice wastes the budget this script exists to save.
const failures = collect(FAIL, SUMMARY);
const warnings = collect(WARN, WARN_NOISE);

// Verdict: an explicit `exit=N` marker wins; else infer from failure hits.
const exitMarker = /(?:^|\n)exit=(\d+)/.exec(text);
let verdict;
if (exitMarker) verdict = exitMarker[1] === "0" ? "PASS" : `FAIL (exit=${exitMarker[1]})`;
else if (failures.length) verdict = "FAIL (inferred — no exit= marker in the log)";
else verdict = "UNKNOWN (no exit= marker, no failure lines — add `; echo \"exit=$?\"` to the command)";

const out = [];
out.push(`${verdict} — ${path} (${lines.length} lines, ${(size / 1024).toFixed(0)} KB)`);

if (summaries.length) {
  out.push("");
  out.push("Summary:");
  for (const [l] of summaries.slice(0, 4)) out.push(`  ${l}`);
}

if (failures.length) {
  out.push("");
  out.push(`Failures (${failures.length} distinct):`);
  for (const [l, n] of failures.slice(0, 12)) {
    const fl = fileLine(l);
    out.push(`  ${fl ? fl + " — " : ""}${l}${n > 1 ? `  (x${n})` : ""}`);
  }
  if (failures.length > 12) out.push(`  +${failures.length - 12} more distinct failure lines`);
}

if (warnings.length) {
  const cap = allWarnings ? warnings.length : 5;
  out.push("");
  out.push("WARN (non-blocking, may be pre-existing):");
  for (const [l, n] of warnings.slice(0, cap)) out.push(`  ${l}${n > 1 ? `  (x${n})` : ""}`);
  if (warnings.length > cap) out.push(`  +${warnings.length - cap} more similar (--all-warnings to see them)`);
}

if (!failures.length) {
  out.push("");
  out.push(`Tail (${tailN}):`);
  for (const l of lines.filter((l) => l.trim()).slice(-tailN)) out.push(`  ${norm(l)}`);
}

out.push("");
out.push(`Full log kept at ${path} — read or grep it directly for anything this digest dropped.`);
console.log(out.join("\n"));
process.exit(0); // a reporter never fails the caller
