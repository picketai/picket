import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, commandPaths, commandPlaces, commandWrappers, kernelLaunchers, loadGuard, tableRows, wordQuotings, type Family, type Grammar } from "#test/variants.mts";

const TESTER = "abcd-tester";
const READ = "cat src/a.mts";

const SEEDS = [READ, "git diff", "picket summary 20261117-x", `picket drive --run "${READ}"`, `picket test note 20261117-x T-2.1 normal blocked --why "$(${READ})"`];

const HIDINGS: ((command: string) => string)[] = [
  (command) => `picket state 20261117-x && ${command}`,
  (command) => `picket state 20261117-x | ${command}`,
  (command) => `picket state \`${command}\``,
  (command) => `picket state <(${command})`,
  (command) => `picket test case 20261117-x --criterion T-2.1 --kind normal --intent x <<EOF\n$(${command})\nEOF`,
  (command) => `picket test case 20261117-x --criterion T-2.1 --kind normal --intent x <<EOF\n\`${command}\`\nEOF`,
  (command) => `picket test case 20261117-x --criterion T-2.1 --kind normal --intent x <<'EOF'\n$(${command})\nEOF`,
  (command) => `bash -c 'picket state 20261117-x; ${command}'`,
];

const testerHidings: Family<string, string> = {
  name: "tester hidings",
  spell: (command) => HIDINGS.map((hide) => hide(command)).map((text) => ({ label: text, input: text })),
};

const testerCommands: Grammar<string, string> = {
  name: "tester commands",
  written: (command) => command,
  label: (command) => command,
  families: [kernelLaunchers, wordQuotings, commandPaths, commandPlaces, commandWrappers, testerHidings],
};

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const payloads = await loadGuard(() => import("./payloads.mts"), "src/lib/hooks/guard/bash/payloads.mts");

closureTests({
  guard: "guard.bash tester commands",
  grammar: testerCommands,
  seeds: SEEDS,
  rows: [
    {
      table: tableRows(payloads, "TESTER_VERBS"),
      key: (verb: string) => verb,
      seedsOf: (verb: string) => [`picket ${verb} 20261117-x --why "$(${READ})"`, `picket ${verb} 20261117-x < src/a.mts`],
    },
  ],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "Bash", agent: TESTER }),
  closed: (decided) => decided === "deny",
});
