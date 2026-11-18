import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, kernelCalls, loadGuard, tableRows } from "#test/variants.mts";

const SPAWNED_DEVELOPER = "abcd-developer";

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const kernel = await loadGuard(() => import("./kernel.mts"), "src/lib/hooks/guard/bash/kernel.mts");

closureTests({
  guard: "guard.bash lead-only verbs",
  grammar: kernelCalls,
  seeds: [
    "picket data show data/a.sql",
    "picket data approve data/a.sql --sha256 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "picket data run 20261118-x customer",
    'picket drive --run "picket data show data/a.sql"',
    'picket drive --run "picket data approve data/a.sql --sha256 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
    'picket drive --run "picket data run 20261118-x customer"',
  ],
  rows: [{ table: tableRows(kernel, "LEAD_ONLY_VERBS"), key: (verb: string) => verb, seedsOf: (verb: string) => [`picket ${verb} 20261116-x --path a --text b`] }],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "Bash", agent: SPAWNED_DEVELOPER }),
  closed: (decided) => decided === "deny",
});
