// Goal-backward verification of one phase against the must_haves the architect wrote into the
// artifact's frontmatter. The verifier checks a data structure; it does not re-derive intent.
//
//   phases:
//     - n: 1
//       files: [src/http/csv.ts, test/csv.test.ts]     # must exist after the phase
//       greps:                                        # each pattern must match in its path
//         - path: src/http/handlers.ts
//           pattern: invoices\.csv
//       tests: true                                   # the project's test command must pass
//       drive: true                                   # a drive-class command must be observed
//
// The drive log is written by the observe.drive hook (Phase 3) into .claude/ledger/drive-log.jsonl.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { deriveState, readArtifact, projectRoot } from "./work.mjs";
import { detectTooling } from "./preflight.mjs";

export function mustHaves(id, n, root = projectRoot()) {
  const art = readArtifact(id, root);
  const list = Array.isArray(art.front?.phases) ? art.front.phases : [];
  return list.find((p) => Number(p.n) === Number(n)) ?? null;
}

export function readDriveLog(root = projectRoot()) {
  const p = join(root, ".claude", "ledger", "drive-log.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function verify(id, n, { root = projectRoot(), runTests = true } = {}) {
  const s = deriveState(id, root);
  const mh = mustHaves(id, n, root);
  const results = [];
  const add = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

  if (!s.phases.some((p) => p.n === Number(n))) {
    add("phase_exists", false, `no ## Phase ${n} in ${s.artifact}`);
    return { ok: false, phase: Number(n), results };
  }
  if (!mh) {
    add("must_haves_declared", false, `frontmatter has no phases[] entry for n: ${n}`);
    return { ok: false, phase: Number(n), results };
  }
  add("must_haves_declared", true, Object.keys(mh).filter((k) => k !== "n").join(", "));

  for (const f of mh.files ?? []) add(`file:${f}`, existsSync(join(root, f)));
  for (const g of mh.greps ?? []) {
    const p = join(root, g.path);
    const ok = existsSync(p) && new RegExp(g.pattern, g.flags ?? "m").test(readFileSync(p, "utf8"));
    add(`grep:${g.path}:${g.pattern}`, ok);
  }
  if (mh.tests) {
    const tooling = detectTooling(root);
    if (!tooling.test) add("tests", false, "no test command detected");
    else if (!runTests) add("tests", true, `skipped (${tooling.test})`);
    else {
      try {
        execSync(tooling.test, { cwd: root, stdio: "ignore", timeout: 300_000, shell: true });
        add("tests", true, tooling.test);
      } catch {
        add("tests", false, `${tooling.test} failed`);
      }
    }
  }
  if (mh.drive) {
    const drives = readDriveLog(root).filter((e) => e.kind === "drive" && (e.work_id === id || !e.work_id) && (e.phase === Number(n) || e.phase == null));
    add("drive_observed", drives.length > 0, drives.length ? `${drives.length} drive-class command(s) observed, last: ${drives.at(-1).command?.slice(0, 80)}` : "no drive-class command observed for this phase");
  }

  return { ok: results.every((r) => r.ok), phase: Number(n), results };
}
