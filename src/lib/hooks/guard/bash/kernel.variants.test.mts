import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, commandLines, loadGuard, powerShellCommands, tableRows } from "#test/variants.mts";

const WRAPPED_SAMPLES: Record<string, string> = {
  "--run": "picket drive 20261116-x --run 'rm -rf build'",
  "--start": "picket drive 20261116-x --start 'rm -rf build'",
  "--only": "picket check 20261116-x --only 'rm -rf build'",
};

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
  guard: "guard.bash wrapped kernel commands",
  grammar: commandLines,
  seeds: [],
  rows: [{ table: tableRows(kernel, "WRAPPING_FLAGS"), key: (flag: string) => flag, seedsOf: (flag: string) => (Object.hasOwn(WRAPPED_SAMPLES, flag) ? [WRAPPED_SAMPLES[flag]] : []) }],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "Bash" }),
  closed: (decided) => decided === "deny",
});

const confirmedRows = { table: tableRows(kernel, "CONFIRMED_SUBVERBS"), key: (command: string) => command, seedsOf: (command: string) => [`picket ${command} 20261116-x customer`] };

closureTests({
  guard: "guard.bash confirmed kernel subverbs",
  grammar: commandLines,
  seeds: [],
  rows: [confirmedRows],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "Bash", mode: "default", session: "s" }),
  closed: (decided) => decided === "deny",
});

closureTests({
  guard: "guard.bash confirmed kernel subverbs on PowerShell",
  grammar: powerShellCommands,
  seeds: [],
  rows: [confirmedRows],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "PowerShell", mode: "default", session: "s" }),
  closed: (decided) => decided === "deny",
});
