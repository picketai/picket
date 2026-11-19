import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, interpreterArgv, programSeeds, SOURCE_PLACEHOLDER, sourceCommands, type Invocation } from "#test/variants.mts";

const SPAWNED_DEVELOPER = "abcd-developer";
const DATA_STATE = ".picket/state/data";
const APPROVALS = `${DATA_STATE}/approvals.jsonl`;
const WORK_ITEM = "work/20261116-x";

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
    `bash -c "cd ${SOURCE_PLACEHOLDER} && cp /tmp/a approvals.jsonl"`,
    `picket drive --run "cd ${SOURCE_PLACEHOLDER} && cp /tmp/a approvals.jsonl"`,
    `pushd ${SOURCE_PLACEHOLDER} && cp /tmp/a approvals.jsonl`,
    `sed -n 'w ${SOURCE_PLACEHOLDER}/approvals.jsonl' /tmp/a`,
    `picket drive --run "sed -n 'w ${SOURCE_PLACEHOLDER}/approvals.jsonl' /tmp/a"`,
    `picket drive --run "cp /tmp/a ${SOURCE_PLACEHOLDER}/appr*"`,
    'picket drive --run "cd ~ && cp /tmp/a .picket/state/data/approvals.jsonl"',
    'picket drive --run "cd /tmp && cd - && cp /tmp/a .picket/state/data/approvals.jsonl"',
  ],
  run: (command: string, t) => asDeveloper(command.replaceAll(SOURCE_PLACEHOLDER, DATA_STATE), t),
  closed: (decided) => decided === "deny",
});

closureTests({
  guard: "guard.bash kernel records in work items",
  grammar: sourceCommands,
  seeds: [
    `echo x >> ${SOURCE_PLACEHOLDER}/comments.jsonl`,
    `cp /tmp/waivers.jsonl ${SOURCE_PLACEHOLDER}/waivers.jsonl`,
    `touch ${SOURCE_PLACEHOLDER}/phases/1.approved`,
    `echo x | tee -a ${SOURCE_PLACEHOLDER}/verdicts.jsonl`,
    `cp -r /tmp/phases ${SOURCE_PLACEHOLDER}/phases`,
    `bash -c "cp a ${SOURCE_PLACEHOLDER}/comments.jsonl"`,
    `picket drive --run "touch ${SOURCE_PLACEHOLDER}/phases/1.approved"`,
    `picket drive --run "cd ${SOURCE_PLACEHOLDER} && touch phases/1.approved"`,
  ],
  run: (command: string, t) => asDeveloper(command.replaceAll(SOURCE_PLACEHOLDER, WORK_ITEM), t),
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
