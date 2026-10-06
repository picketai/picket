import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(".");

const UNSCANNED_PREFIXES = ["work/", "spike/", "tmp/", "artifacts/reports/", "bench/results/"];
const SKILL_EXAMPLES = /^\.claude\/skills\/[^/]+\/examples\//;

const ELSEWHERE = [
  {
    why: "created at run time or kept machine-local",
    paths: [
      ".claude/PROJECT-MAP.md",
      ".claude/agent-memory/analyst/MEMORY.md",
      ".claude/settings.local.json",
      ".tether/state/",
      ".tether/state/branching.yaml",
      ".tether/state/drive-log.jsonl",
      ".tether/state/ledger.jsonl",
      ".opensrc/",
      ".worktrees/",
      "artifacts/api/",
      "bench/.runs/",
      "bench/results/spend.log",
    ],
  },
  { why: "relative to a work item or a git remote", paths: ["phases/", "origin/"] },
  {
    why: "the layout of a host project, not this repository",
    paths: [
      "API/",
      "Application/",
      "Common/",
      "Domain/",
      "Features/",
      "Infrastructure/",
      "Presentation/",
      "Shared/",
      "docs/",
      "src/",
      "src/auth.ts",
      ".azuredevops/pull_request_template.md",
      ".github/PULL_REQUEST_TEMPLATE.md",
    ],
  },
  { why: "inside a bench run repository", paths: ["data/invoices.json", "test/hidden/"] },
  { why: "planned by SDR-00001", paths: ["rules/"] },
  { why: "cited by SDR-00001 where it stood before the move to .claude/lib/", paths: [".claude/hooks/lib/transcript.mjs"] },
];

const NOT_A_PATH_CHAR = /[\s<>*{}[\]$~|"'=(),…]/;
const ABSOLUTE_OR_REMOTE = /^(\/|\.\.\/|[A-Za-z]:|[A-Za-z][A-Za-z0-9+.-]*:\/\/)/;
const LOCATION_SUFFIX = /(#.*|:\d+(-\d+)?(:\d+)?)$/;
const ENDS_LIKE_A_PATH = /(\/|\.[A-Za-z0-9]+)$/;

function pathCandidate(span) {
  if (NOT_A_PATH_CHAR.test(span) || ABSOLUTE_OR_REMOTE.test(span)) return null;
  const path = span.replace(LOCATION_SUFFIX, "");
  return path.includes("/") && ENDS_LIKE_A_PATH.test(path) ? path : null;
}

function inlineSpans(markdown) {
  const spans = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const m of line.matchAll(/`([^`]+)`/g)) spans.push(m[1]);
  }
  return spans;
}

function citedPaths(markdown) {
  return inlineSpans(markdown).map(pathCandidate).filter(Boolean);
}

function listedFiles() {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\0").filter((p) => p && existsSync(join(ROOT, p)));
}

function repositoryListing() {
  const files = new Set(listedFiles());
  const dirs = new Set();
  for (const f of files) for (let d = posix.dirname(f); d !== "."; d = posix.dirname(d)) dirs.add(`${d}/`);
  return { files, dirs, has: (p) => (p.endsWith("/") ? dirs.has(p) : files.has(p) || dirs.has(`${p}/`)) };
}

function isScanned(file) {
  return file.endsWith(".md") && !UNSCANNED_PREFIXES.some((p) => file.startsWith(p)) && !SKILL_EXAMPLES.test(file);
}

function resolvesFrom(file, path, listing) {
  const trailing = path.endsWith("/") ? "/" : "";
  for (let dir = posix.dirname(file); ; dir = posix.dirname(dir)) {
    const candidate = posix.normalize(posix.join(dir, path)).replace(/\/$/, "") + trailing;
    if (listing.has(candidate)) return true;
    if (dir === ".") return false;
  }
}

function citations(listing) {
  const all = [];
  for (const file of [...listing.files].filter(isScanned).sort()) {
    for (const path of citedPaths(readFileSync(join(ROOT, file), "utf8"))) all.push({ file, path });
  }
  return all;
}

const elsewhere = new Set(ELSEWHERE.flatMap((g) => g.paths));

test("a backticked span is a path candidate only when it looks like a repository path", () => {
  assert.equal(pathCandidate(".claude/lib/admit.mjs:18"), ".claude/lib/admit.mjs");
  assert.equal(pathCandidate(".claude/rules/"), ".claude/rules/");
  assert.equal(pathCandidate(".claude/agents/assets/detectors.yaml#test_authoring_policy"), ".claude/agents/assets/detectors.yaml");
  for (const span of ["work/<id>/", "work/**", "tok/line", "src/Rent", "SKILL.md", "https://x.y/a.md", "/etc/hosts.conf", "../up/a.md", "C:/x/a.md", "npm test", "a/b.md, c/d.md"]) {
    assert.equal(pathCandidate(span), null, span);
  }
});

test("spans inside fenced blocks are not cited", () => {
  assert.deepEqual(citedPaths("see `a/b.md`\n```\n`c/d.md`\n```\nand `e/f.md`"), ["a/b.md", "e/f.md"]);
});

test("every path cited in the scanned Markdown exists in the repository or is listed as elsewhere", () => {
  const listing = repositoryListing();
  const misses = citations(listing)
    .filter(({ file, path }) => !elsewhere.has(path) && !resolvesFrom(file, path, listing))
    .map(({ file, path }) => `${file}: ${path}`);
  assert.deepEqual([...new Set(misses)], []);
});

test("every elsewhere path is still cited and still absent from the repository", () => {
  const listing = repositoryListing();
  const cited = new Set(citations(listing).map((c) => c.path));
  const stale = [...elsewhere].filter((p) => !cited.has(p)).map((p) => `no longer cited: ${p}`);
  const present = [...elsewhere].filter((p) => listing.has(p)).map((p) => `now exists: ${p}`);
  assert.deepEqual([...stale, ...present], []);
});
