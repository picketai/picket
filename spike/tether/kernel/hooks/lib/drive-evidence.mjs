// Drive evidence — the machine record behind the developer's `**Verification:**`
// field (implement.md step 7a, detectors.yaml#verification_rules).
//
// Why this exists: step 7a already says the right thing — "Verified means
// OBSERVED at runtime — a command you ran and output you saw. Reading the code
// again is not verification." But guard.verdict only checked that the field was
// non-empty, so `**Verification:** ran the flow, looked fine` passed. The
// contract was well-specified and unenforced: the one place the harness took a
// claim on trust for a fact that opens a gate.
//
// The colleague's harness solves this with a stamp written BY the verify script.
// We have no fixed script — the developer drives the flow with a project-detected
// command — so the evidence comes from OBSERVING what actually ran:
// observe.bash.mjs records every Bash call, and the agent cannot write that log.
//
// Deliberately asymmetric: the classifier below treats anything that is neither
// a recognised inspection command nor a recognised build/test command as a
// drive. A false "that was a drive" only preserves today's behaviour (a claim
// passes); a false "that was not a drive" would block real work. Bias
// accordingly — UNKNOWN commands count as drives.
//
// The NEUTRAL class is the correction to the first version of this file, which
// had only INSPECT and DRIVE. The developer runs the test suite every phase by
// mandate (developer.md, implement.md step 7), and `npm test` matched no
// inspection pattern — so it was logged as a drive, drivesForCurrentPhase() was
// never empty, and the gate could not fire. That inverted the rule it exists to
// enforce: implement.md step 7a opens with "A green suite is not verification",
// and the machine built to enforce that sentence was accepting a green suite as
// the evidence for it. Measured on this repo's own log: the very first recorded
// entry is `cd … && mkdir -p … && git init` at "drive":true.
//
// NEUTRAL is neither evidence nor an error: running the suite is required and
// proves nothing about the runtime surface. Only INSPECT and NEUTRAL are
// enumerated; everything else is still a drive.
import { existsSync, appendFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export const DRIVE_LOG = join(".claude", "state", "drive-log.jsonl");

// Inspection commands: reading the repo, asking git questions, checking syntax.
// None of these can constitute runtime evidence for an acceptance criterion.
const INSPECT = [
  /^git\s+(status|log|diff|show|blame|ls-files|rev-parse|describe|shortlog|branch|remote|stash\s+list|config)\b/,
  /^(rg|grep|egrep|fgrep|ack)\b/,
  /^(cat|head|tail|less|more|bat)\b/,
  /^(ls|dir|find|tree|pwd|cd|stat|file|wc|du|df)\b/,
  /^(sed|awk|cut|sort|uniq|tr|jq|yq)\b/,
  /^(echo|printf|true|false|test|which|type|whoami|date|env|printenv)\b/,
  /^node\s+--check\b/,
  /^(mkdir|touch|cp|mv|ln)\b/, // filesystem shuffling is not runtime evidence
  /^(Get-|Test-Path|Select-String|Measure-Object|Resolve-Path)/i, // read-only PS cmdlets
];

// Build, test, lint, and format commands. Mandatory every phase, and evidence
// for nothing: config wiring, DI registration, HTTP base paths, and payload
// shapes are exactly what a green suite does not exercise. Kept deliberately
// literal — a pattern broad enough to swallow `dotnet run` or `go run` would
// re-open the hole this class closes.
const NEUTRAL = [
  /^(npm|pnpm|yarn|bun)\s+(run\s+)?(test|lint|typecheck|type-check|check|format|build)\b/,
  /^(npx|bunx)\s+(jest|vitest|mocha|ava|eslint|biome|prettier|tsc)\b/,
  /^(jest|vitest|mocha|ava|eslint|biome|prettier|tsc)\b/,
  /^dotnet\s+(test|build|format|restore)\b/,
  /^(pytest|tox|nox|ruff|flake8|black|isort|mypy)\b/,
  /^python\s+-m\s+(pytest|unittest|ruff|black|mypy)\b/,
  /^go\s+(test|vet|build)\b/,
  /^cargo\s+(test|clippy|check|build|fmt)\b/,
  /^(mvn|\.\/mvnw)\b.*\b(test|verify|compile|package)\b/,
  /^(gradle|\.\/gradlew)\b.*\b(test|check|build|assemble)\b/,
  /^(ctest|deno\s+(test|lint|check)|golangci-lint\b)/,
  /^make\s+(test|lint|check|build|format)\b/,
  // Version-control bookkeeping. INSPECT already covers the read-only git
  // subcommands; these mutate, but they are still not runtime evidence for an
  // acceptance criterion. `git commit` in particular MUST land here — the
  // developer commits every phase (the summary carries a commit range), so
  // leaving it in the drive class would defeat the gate exactly as `npm test`
  // did. The stash dance in developer.md is the same case.
  /^git\s+(init|add|commit|checkout|switch|restore|stash|tag|merge|rebase|reset|clean|worktree|push|pull|fetch)\b/,
  // The digest of a test log is a report about a suite run, not a drive.
  /logdigest\.mjs\b/,
  // The harness's own sweeps.
  /lint\.(write|contract)\.mjs\b/,
];

const classify = (seg) =>
  INSPECT.some((re) => re.test(seg)) ? "inspect" : NEUTRAL.some((re) => re.test(seg)) ? "neutral" : "drive";

// A compound command counts as a drive if ANY segment is neither inspection nor
// build/test. `npm test > log 2>&1; echo "exit=$?"` stays neutral; `npm start`
// or `curl localhost:5000/orders` does not.
export function isDriveCommand(cmd) {
  if (typeof cmd !== "string" || !cmd.trim()) return false;
  const segments = cmd
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim().replace(/^[({\s]+/, ""))
    .filter(Boolean);
  if (!segments.length) return false;
  return segments.some((seg) => classify(seg) === "drive");
}

// Tree identity, so evidence can be tied to the code it was observed against.
// Documentation and harness bookkeeping are excluded: a phase legitimately ends
// by stamping a plan and writing memory, and neither invalidates a drive.
const EXCLUDES = [
  ":(exclude)*.md",
  ":(exclude)artifacts",
  ":(exclude).claude/agent-memory",
  ":(exclude).claude/state",
  ":(exclude).claude/telemetry",
];

export function treeHash(root) {
  try {
    const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirt = execFileSync("git", ["-C", root, "status", "--porcelain", "--", ".", ...EXCLUDES], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return createHash("sha1").update(`${head}\n${dirt}`).digest("hex").slice(0, 16);
  } catch {
    return null; // not a git repo, or git unavailable — evidence degrades to unstamped
  }
}

export function appendEvidence(root, record) {
  try {
    const path = join(root, DRIVE_LOG);
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(record) + "\n");
  } catch {
    // best-effort: evidence recording must never break a tool call
  }
}

export function readEvidence(root) {
  try {
    const path = join(root, DRIVE_LOG);
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// What does the phase summary's `**Verification:**` field actually claim?
// The two exemption forms are contract-legal (implement.md step 7a) and must stay
// passable without evidence — that is the point. Making the exemption the only
// honest way past the gate is the win: it is explicit, and the user sees it.
// `shaped` reports whether a drive claim follows the output format's own
// `<command driven> → <observed result>` form. It is the deterministic half of
// the check: implement.md's Output format mandates the arrow, so a claim
// without one names no command and quotes no output. `**Verification:** ran the
// flow, looked fine` — the literal example this gate was built for — fails here
// with no reference to the evidence log at all.
export function classifyVerification(text) {
  const m = /^\*\*Verification:\*\*\s*(.+)$/m.exec(text);
  if (!m) return { claim: "missing", detail: "", shaped: false };
  const line = m[1].trim();
  if (!line) return { claim: "missing", detail: "", shaped: false };
  if (/^no drivable surface\b/i.test(line)) return { claim: "exempt-no-surface", detail: line, shaped: true };
  if (/^not drivable in this environment\b/i.test(line)) return { claim: "exempt-blocked", detail: line, shaped: true };
  return { claim: "drive", detail: line, shaped: /→|->/.test(line) };
}

// Does the claimed command resemble one the harness actually observed?
//
// MEASURED, NOT ENFORCED — deliberately, and for the same reason `drive_fresh`
// is: a developer may legitimately paraphrase ("booted the API and hit
// /orders"), and blocking on a fuzzy string match would halt real work to
// punish wording. emit.metrics records the result so the false-positive rate
// becomes a number; promote it to a block only once the ledger says it is safe.
// Returns true / false / null (nothing comparable).
const CLAIM_NOISE = new Set(["the", "and", "then", "with", "ran", "run", "via", "using", "from", "against"]);

export function claimMatchesObserved(detail, drives) {
  if (!detail || !drives?.length) return null;
  const claimed = detail.split(/→|->/)[0].toLowerCase();
  const tokens = claimed
    .replace(/[`'"()]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !CLAIM_NOISE.has(t))
    .slice(0, 4);
  if (!tokens.length) return null;
  const observed = drives.map((d) => (d.cmd ?? "").toLowerCase());
  return tokens.some((t) => observed.some((c) => c.includes(t)));
}

// Drive evidence relevant to the phase being summarised: entries recorded after
// the previous phase block cleared in this session. Without that boundary a
// single early drive would vouch for every later phase in a long session.
export function drivesForCurrentPhase(root, sessionId) {
  const rows = readEvidence(root).filter((r) => !sessionId || r.session === sessionId);
  let start = 0;
  for (let i = rows.length - 1; i >= 0; i--)
    if (rows[i].marker === "phase-cleared") {
      start = i + 1;
      break;
    }
  return rows.slice(start).filter((r) => r.drive);
}
