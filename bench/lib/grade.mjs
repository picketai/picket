// HARD graders only: hidden tests, file assertions, grep assertions, report shape.
// No LLM judge here; pass/fail is reproducible from the repository the run left behind.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { listFiles } from "./fixture.mjs";

function runVitest(repo, extraArgs = []) {
  const outFile = join(repo, ".bench-vitest.json");
  try {
    execFileSync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${outFile}`, ...extraArgs], {
      cwd: repo,
      stdio: "ignore",
      shell: true,
      timeout: 180_000,
    });
  } catch {
    // vitest exits non-zero on failures; the JSON file still tells us what happened
  }
  if (!existsSync(outFile)) return { passed: 0, failed: 0, total: 0, error: "no vitest output" };
  const j = JSON.parse(readFileSync(outFile, "utf8"));
  // Name what failed, not only how many: a record that says "3/4 passed" is a number, one that says
  // which assertion broke is a fix list.
  const failures = (j.testResults ?? []).flatMap((f) =>
    (f.assertionResults ?? [])
      .filter((a) => a.status === "failed")
      .map((a) => `${a.fullName}: ${String(a.failureMessages?.[0] ?? "").split(/\r?\n/)[0].slice(0, 160)}`),
  );
  return { passed: j.numPassedTests ?? 0, failed: j.numFailedTests ?? 0, total: j.numTotalTests ?? 0, error: null, failures };
}

function globMatch(pattern, path) {
  const re = new RegExp(
    "^" +
      pattern
        .replaceAll("\\", "/")
        .replace(/[.+^${}()|[\]]/g, "\\$&")
        .replace(/\*\*\//g, "(?:.*/)?")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*") +
      "$",
  );
  return re.test(path.replaceAll("\\", "/"));
}

export function filesMatching(repo, pattern) {
  return listFiles(repo).filter((f) => globMatch(pattern, f));
}

/**
 * @param {object} o
 * @param {string} o.repo      repository after the run
 * @param {object} o.task      task definition (bench/tasks/<id>.json)
 * @param {string} o.hiddenDir bench/hidden/<task.id>
 * @param {object} o.adapter   harness adapter (for reportFiles)
 */
export function grade({ repo, task, hiddenDir, adapter, base = "HEAD", runner = runVitest }) {
  const checks = [];
  const ok = (name, pass, detail = "") => checks.push({ name, ok: !!pass, detail });

  // 1. The fixture's own suite still passes (the agent may have added tests; they count too).
  const own = runner(repo, ["--exclude", "test/hidden/**"]); // a re-grade must not count an earlier hidden copy as the project's own suite
  ok("own_suite_green", own.failed === 0 && own.total > 0 && !own.error, `${own.passed}/${own.total} passed${own.error ? ", " + own.error : ""}`);

  // 2. Hidden tests, if the task ships any.
  let hidden = null;
  if (existsSync(hiddenDir) && readdirSync(hiddenDir).length) {
    const target = join(repo, "test", "hidden");
    cpSync(hiddenDir, target, { recursive: true });
    hidden = runner(repo, ["test/hidden"]);
    ok("hidden_tests_green", hidden.failed === 0 && hidden.total > 0 && !hidden.error, `${hidden.passed}/${hidden.total} passed${hidden.error ? ", " + hidden.error : ""}${hidden.failures?.length ? "; " + hidden.failures.join(" | ") : ""}`);
  }

  // 3. Declarative checks.
  for (const pattern of task.checks?.files_exist ?? []) {
    const hits = filesMatching(repo, pattern);
    ok(`exists:${pattern}`, hits.length > 0, hits.slice(0, 3).join(", "));
  }
  for (const pattern of task.checks?.files_absent ?? []) {
    const hits = filesMatching(repo, pattern);
    ok(`absent:${pattern}`, hits.length === 0, hits.slice(0, 3).join(", "));
  }
  for (const g of task.checks?.grep ?? []) {
    const files = filesMatching(repo, g.path);
    const re = new RegExp(g.pattern, g.flags ?? "m");
    const found = files.some((f) => re.test(readFileSync(join(repo, f), "utf8")));
    const expect = g.expect ?? true;
    ok(`grep:${g.path}:${g.pattern}`, found === expect, `${files.length} file(s) scanned`);
  }
  if (task.checks?.tests_added) {
    const added = runTestFiles(repo, base);
    ok("tests_added", added.length > 0, added.slice(0, 3).join(", "));
  }
  if (task.checks?.red_first) {
    const red = redFirst({ repo, base, runner });
    ok("red_first", red.ok, red.detail);
  }
  if (task.checks?.forbidden_paths_touched) {
    const all = changedFiles(repo, base).filter((f) => !f.startsWith("test/hidden/") && !isHarnessFile(f) && f !== ".bench-vitest.json");
    for (const pattern of task.checks.forbidden_paths_touched) {
      const hits = all.filter((f) => globMatch(pattern, f));
      ok(`untouched:${pattern}`, hits.length === 0, hits.join(", "));
    }
  }

  // 4. Research tasks: a report exists, carries the required headings, and every cited repo path exists.
  if (task.checks?.report) {
    const files = adapter.reportFiles(repo);
    ok("report_exists", files.length > 0, files.join(", "));
    if (files.length) {
      const text = files.map((f) => readFileSync(join(repo, f), "utf8")).join("\n");
      for (const heading of task.checks.report.headings ?? []) {
        ok(`report_heading:${heading}`, new RegExp(`^#+\\s*${heading}`, "mi").test(text));
      }
      const cited = [...text.matchAll(/`((?:src|test|data)\/[\w./-]+)`/g)].map((m) => m[1]);
      const missing = cited.filter((p) => !existsSync(join(repo, p.split(":")[0])));
      ok("report_cited_paths_exist", cited.length > 0 && missing.length === 0, missing.length ? `missing: ${missing.slice(0, 3).join(", ")}` : `${cited.length} citations`);
      for (const term of task.checks.report.mentions ?? []) {
        ok(`report_mentions:${term}`, new RegExp(term, "i").test(text));
      }
    }
  }

  const pass = checks.every((c) => c.ok);
  return { pass, own, hidden, checks };
}

export const HARNESS_DIRS = Object.freeze([".claude/", ".picket/"]);

export function isHarnessFile(path) {
  return HARNESS_DIRS.some((dir) => path.startsWith(dir));
}

const BOOKKEEPING = ["work/", "artifacts/", "test/hidden/"];
const GRADER_FILES = [".bench-vitest.json"];

function isRunProduct(path) {
  return !isHarnessFile(path) && !BOOKKEEPING.some((dir) => path.startsWith(dir)) && !GRADER_FILES.includes(path);
}

function isTestFile(path) {
  return path.startsWith("test/");
}

export function runTestFiles(repo, base = "HEAD") {
  return changedFiles(repo, base).filter((f) => isRunProduct(f) && isTestFile(f) && existsSync(join(repo, f))).sort();
}

function baseContent(repo, base, path) {
  try {
    return execFileSync("git", ["show", `${base}:${path}`], { cwd: repo, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function currentContent(repo, path) {
  const file = join(repo, path);
  return existsSync(file) ? readFileSync(file) : null;
}

function putContent(repo, path, bytes) {
  const file = join(repo, path);
  if (bytes === null) rmSync(file, { force: true });
  else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
}

export function redFirst({ repo, base = "HEAD", runner = runVitest }) {
  const tests = runTestFiles(repo, base);
  if (!tests.length) return { ok: false, detail: "the run added or changed no test" };
  const sources = changedFiles(repo, base).filter((f) => isRunProduct(f) && !isTestFile(f));
  const saved = sources.map((path) => ({ path, bytes: currentContent(repo, path) }));
  try {
    for (const { path } of saved) putContent(repo, path, baseContent(repo, base, path));
    const result = runner(repo, tests);
    if (result.error) return { ok: false, detail: `on the base source: ${result.error}` };
    return { ok: result.failed > 0, detail: `on the base source: ${result.failed} of ${result.total} failed in ${tests.join(", ")}` };
  } finally {
    for (const { path, bytes } of saved) putContent(repo, path, bytes);
  }
}

/** Files the agent changed since `base` (the harness-install commit), committed or not, plus untracked. */
export function changedFiles(repo, base = "HEAD") {
  const diffed = execFileSync("git", ["diff", "--name-only", base], { cwd: repo }).toString().split(/\r?\n/);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: repo }).toString().split(/\r?\n/);
  return [...new Set([...diffed, ...untracked].map((l) => l.trim()).filter(Boolean))];
}

export function linesAdded(repo, base = "HEAD") {
  try {
    const out = execFileSync("git", ["diff", "--numstat", base], { cwd: repo }).toString();
    let added = 0;
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^(\d+)\t(\d+)\t(.+)$/);
      if (!m) continue;
      if (m[3].startsWith("artifacts/") || m[3].startsWith("work/") || isHarnessFile(m[3])) continue;
      added += Number(m[1]);
    }
    // untracked files are not in `git diff HEAD`; count their lines too
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: repo }).toString().split(/\r?\n/).filter(Boolean);
    for (const f of untracked) {
      if (f.startsWith("artifacts/") || f.startsWith("work/") || isHarnessFile(f) || f.startsWith("test/hidden/")) continue;
      const p = join(repo, f);
      if (statSync(p).isFile()) added += readFileSync(p, "utf8").split(/\r?\n/).length;
    }
    return added;
  } catch {
    return null;
  }
}

export { relative };
