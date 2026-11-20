import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, commandLines } from "#test/variants.mts";
import { ASKING_MODES } from "../../../shared/escalation.mts";

const MARKED = 'PICKET_ESCALATE="you asked" ';
const NON_ASKING_MODES = ["bypassPermissions", "dontAsk", "plan"];

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

function decisionsIn(modes: readonly string[]) {
  return (command: string, t: TestContext) => modes.map((mode) => decision(command, { root: projectOf(t), tool: "Bash", mode, session: "s" }));
}

const allDenied = (decided: (string | null)[]) => decided.every((one) => one === "deny");

closureTests({
  guard: "guard.bash escalation outside an asking mode",
  grammar: commandLines,
  seeds: ["rm -rf build", "git push origin trunk", "npm publish"].map((command) => `${MARKED}${command}`),
  run: decisionsIn(NON_ASKING_MODES),
  closed: allDenied,
});

closureTests({
  guard: "guard.bash escalation of more than one command",
  grammar: commandLines,
  seeds: [";", " &&", " |"].map((join) => `${MARKED}rm a${join} rm b`),
  run: decisionsIn([...ASKING_MODES]),
  closed: allDenied,
});

closureTests({
  guard: "guard.bash escalation of a data run",
  grammar: commandLines,
  seeds: ["picket data run 20261116-x customer", "picket data run 20261116-x customer extra"].map((command) => `${MARKED}${command}`),
  run: decisionsIn([...ASKING_MODES, ...NON_ASKING_MODES]),
  closed: allDenied,
});
