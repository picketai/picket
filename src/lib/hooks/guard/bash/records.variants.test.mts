import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, interpreterArgv, programSeeds, SOURCE_PLACEHOLDER, sourceCommands, type Invocation } from "#test/variants.mts";

const SPAWNED_DEVELOPER = "abcd-developer";
const DATA_STATE = ".picket/state/data";
const APPROVALS = `${DATA_STATE}/approvals.jsonl`;

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const asDeveloper = (command: string, t: TestContext) => decision(command, { root: projectOf(t), tool: "Bash", agent: SPAWNED_DEVELOPER });

closureTests({
  guard: "guard.bash kernel records",
  grammar: sourceCommands,
  seeds: [
    `echo x >> ${SOURCE_PLACEHOLDER}/approvals.jsonl`,
    `echo x | tee -a ${SOURCE_PLACEHOLDER}/approvals.jsonl`,
    `cp a ${SOURCE_PLACEHOLDER}/approvals.jsonl`,
    `mv a ${SOURCE_PLACEHOLDER}/runs.jsonl`,
    `touch ${SOURCE_PLACEHOLDER}/approvals.jsonl`,
    `cd ${SOURCE_PLACEHOLDER} && cp /tmp/a approvals.jsonl`,
    `bash -c "cp a ${SOURCE_PLACEHOLDER}/approvals.jsonl"`,
    `picket drive --run "echo x >> ${SOURCE_PLACEHOLDER}/approvals.jsonl"`,
  ],
  run: (command: string, t) => asDeveloper(command.replaceAll(SOURCE_PLACEHOLDER, DATA_STATE), t),
  closed: (decided) => decided === "deny",
});

const shellLine = ({ argv, heredocs }: Invocation): string => {
  const quoted = argv.map((word) => `'${word.replaceAll("'", "'\\''")}'`).join(" ");
  return heredocs.length === 0 ? quoted : `${quoted} <<'EOF'\n${heredocs.join("\n")}\nEOF`;
};

closureTests({
  guard: "guard.bash kernel records in programs",
  grammar: interpreterArgv,
  seeds: programSeeds({
    node: [`require('fs').appendFileSync('${APPROVALS}','x')`],
    python3: [`open('${APPROVALS}','a').write('x')`],
  }),
  run: (invocation: Invocation, t) => asDeveloper(shellLine(invocation), t),
  closed: (decided) => decided === "deny",
});
