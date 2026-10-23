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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { phaseOf, readSnapshot } from "../../shared/work/snapshot.mjs";
import { projectRoot } from "../../shared/paths.mjs";
import { detectTooling } from "../../shared/tooling.mjs";
import { readDriveLog } from "../../shared/drive-log.mjs";

function skippedNote(skipped) {
  return skipped ? ` (${skipped} unreadable line${skipped === 1 ? "" : "s"} skipped)` : "";
}

export function verify(id, n, { root = projectRoot(), runTests = true } = {}) {
  const snap = readSnapshot(root, id);
  const phase = phaseOf(snap, Number(n));
  const results = [];
  const add = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

  if (!phase) {
    add("phase_exists", false, `no ## Phase ${n} in ${snap.artifact?.path ?? null}`);
    return { ok: false, phase: Number(n), results };
  }
  const mh = phase.entry;
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
  const { tooling, warnings } = mh.tests ? detectTooling(root) : { tooling: null, warnings: [] };
  if (mh.tests) {
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
    const log = readDriveLog(root);
    const drives = log.rows.filter((e) => e.kind === "drive" && (e.work_id === id || !e.work_id) && (e.phase === Number(n) || e.phase == null));
    const detail = drives.length ? `${drives.length} drive-class command(s) observed, last: ${drives.at(-1).command?.slice(0, 80)}` : "no drive-class command observed for this phase";
    add("drive_observed", drives.length > 0, detail + skippedNote(log.skipped));
  }

  return { ok: results.every((r) => r.ok), phase: Number(n), results, ...(warnings.length ? { warnings } : {}) };
}
