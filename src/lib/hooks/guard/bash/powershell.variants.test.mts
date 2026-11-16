import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, loadGuard, powerShellCommands, tableRows } from "#test/variants.mts";

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const rules = await loadGuard(() => import("./rules.mts"), "src/lib/hooks/guard/bash/rules.mts");

closureTests({
  guard: "guard.bash on PowerShell",
  grammar: powerShellCommands,
  seeds: ["git push origin trunk", "git reset --hard"],
  rows: [{ table: tableRows(rules, "DENIED_NAMES"), key: (name: string) => name, seedsOf: (name: string) => [`${name} x`] }],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "PowerShell" }),
  closed: (decided) => decided === "deny",
});
