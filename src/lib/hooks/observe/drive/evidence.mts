// Deliberately asymmetric: the classifier below treats anything that is neither
// a recognised inspection command nor a recognised build/test command as a
// drive. A false "that was a drive" only preserves today's behaviour (a claim
// passes); a false "that was not a drive" would block real work. Bias
// accordingly — UNKNOWN commands count as drives.
//
// NEUTRAL is neither evidence nor an error: running the suite is required and
// proves nothing about the runtime surface. Only INSPECT and NEUTRAL are
// enumerated; everything else is still a drive.

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

const classify = (seg: string): "inspect" | "neutral" | "drive" =>
  INSPECT.some((re) => re.test(seg)) ? "inspect" : NEUTRAL.some((re) => re.test(seg)) ? "neutral" : "drive";

// A compound command counts as a drive if ANY segment is neither inspection nor
// build/test. `npm test > log 2>&1; echo "exit=$?"` stays neutral; `npm start`
// or `curl localhost:5000/orders` does not.
export function isDriveCommand(cmd: unknown): boolean {
  if (typeof cmd !== "string" || !cmd.trim()) return false;
  const segments = cmd
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim().replace(/^[({\s]+/, ""))
    .filter(Boolean);
  if (!segments.length) return false;
  return segments.some((seg) => classify(seg) === "drive");
}
