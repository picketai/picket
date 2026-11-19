import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { guardOutput, type DecisionOptions } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const SPAWNED_DEVELOPER = "abcd-developer";
const APPROVALS = ".picket/state/data/approvals.jsonl";

const BASH_RECORD_WRITES = [
  `echo '{"path":"data/x.sql","sha256":"ab"}' >> ${APPROVALS}`,
  `echo x | tee -a ${APPROVALS}`,
  `cp /tmp/a ${APPROVALS}`,
  `node -e "require('fs').appendFileSync('${APPROVALS}','x')"`,
  'bash -c "cp /tmp/a .picket/state/data/runs.jsonl"',
  `picket drive --run "echo x >> ${APPROVALS}"`,
  "cp -r /tmp/forged .picket/state",
  "echo x >> .picket/state/ledger.jsonl",
  "echo x >> .picket/state/statusline.mjs",
];
const POWERSHELL_RECORD_WRITE = `Add-Content -Path ${APPROVALS} -Value x`;

type Judge = (command: string, more?: Partial<DecisionOptions>) => ReturnType<typeof guardOutput>;

function judgeIn(t: TestContext): Judge {
  const root = withProject(t, { host: true, picket: false });
  const home = withProject(t, { picket: false });
  return (command, more = {}) => guardOutput(command, { root, home, tool: "Bash", ...more });
}

function assertRecordDenial(out: ReturnType<typeof guardOutput>, command: string): void {
  assert.equal(out?.permissionDecision, "deny", command);
  assert.match(out?.permissionDecisionReason ?? "", /kernel record/, command);
}

test("a spawned agent's Bash write to a kernel record is denied as a kernel record (T-1.1)", (t) => {
  const judge = judgeIn(t);
  for (const command of BASH_RECORD_WRITES) assertRecordDenial(judge(command, { agent: SPAWNED_DEVELOPER }), command);
});

test("a spawned agent's PowerShell Add-Content to a kernel record is denied as a kernel record (T-1.1)", (t) => {
  const judge = judgeIn(t);
  assertRecordDenial(judge(POWERSHELL_RECORD_WRITE, { tool: "PowerShell", agent: SPAWNED_DEVELOPER }), POWERSHELL_RECORD_WRITE);
});

test("an escalated record write is denied, never asked (T-1.2)", (t) => {
  const judge = judgeIn(t);
  const command = `PICKET_ESCALATE="x" cp /tmp/a ${APPROVALS}`;
  assertRecordDenial(judge(command, { agent: SPAWNED_DEVELOPER, mode: "default", session: "s1" }), command);
});

test("reads of records and writes to log sinks keep their base decisions for a spawned agent (T-1.3)", (t) => {
  const judge = judgeIn(t);
  const decided = (command: string, tool = "Bash") => judge(command, { tool, agent: SPAWNED_DEVELOPER })?.permissionDecision ?? null;
  for (const command of [`cat ${APPROVALS}`, "grep x .picket/state/ledger.jsonl", "tail -3 .picket/state/drive-log.jsonl", "ls .picket/state", "echo hi >> .picket/state/check-command.log"]) {
    assert.equal(decided(command), "allow", command);
  }
  for (const command of ["echo hi > .picket/state/scratch/x/notes.txt", "mkdir -p .picket/state/scratch/20261119-x", "echo x >> .picket/state/branching.yaml"]) {
    assert.equal(decided(command), null, command);
  }
  assert.equal(decided(`Get-Content ${APPROVALS}`, "PowerShell"), null);
});

test("the lead's record writes give no decision, as before the check (T-1.4)", (t) => {
  const judge = judgeIn(t);
  for (const command of BASH_RECORD_WRITES) assert.equal(judge(command), null, command);
  assert.equal(judge(POWERSHELL_RECORD_WRITE, { tool: "PowerShell" }), null);
});

const WORK_ITEM = "work/20261119-x";
const WORK_RECORD_WRITES = [
  `echo x >> ${WORK_ITEM}/comments.jsonl`,
  `cp /tmp/a ${WORK_ITEM}/waivers.jsonl`,
  `touch ${WORK_ITEM}/phases/1.approved`,
  `echo x >> ${WORK_ITEM}/verdicts.jsonl`,
  `node -e "require('fs').appendFileSync('${WORK_ITEM}/waivers.jsonl','x')"`,
  `picket drive --run "touch ${WORK_ITEM}/phases/1.approved"`,
];

test("a spawned agent's write to a kernel-owned work item entry is denied as a kernel record (T-2.1)", (t) => {
  const judge = judgeIn(t);
  for (const command of WORK_RECORD_WRITES) assertRecordDenial(judge(command, { agent: SPAWNED_DEVELOPER }), command);
});

test("reads of work entries and writes to the artifact keep their base decisions for a spawned agent (T-2.2)", (t) => {
  const judge = judgeIn(t);
  const decided = (command: string) => judge(command, { agent: SPAWNED_DEVELOPER })?.permissionDecision ?? null;
  assert.equal(decided(`cat ${WORK_ITEM}/comments.jsonl`), "allow");
  for (const command of [`echo x > ${WORK_ITEM}/order.md`, `git add -A -- src/a.ts ${WORK_ITEM}/order.md`]) assert.equal(decided(command), null, command);
});

test("the lead's writes to kernel-owned work entries give no decision, as before the check (T-2.3)", (t) => {
  const judge = judgeIn(t);
  for (const command of WORK_RECORD_WRITES) assert.equal(judge(command), null, command);
});

const HIDDEN_RECORD_WRITES = [
  'picket drive --run "cd .picket/state/data && cp /tmp/a approvals.jsonl"',
  'picket drive --run "cd .picket/state && cp /tmp/a data/approvals.jsonl"',
  'bash -c "cd .picket/state && echo x >> data/approvals.jsonl"',
  `picket drive --run "cd ${WORK_ITEM} && touch phases/1.approved"`,
  "pushd .picket/state/data && cp /tmp/a approvals.jsonl",
  `sed -n 'w ${APPROVALS}' /tmp/a`,
  `sed 's/a/b/w ${APPROVALS}' /tmp/a`,
  `picket drive --run "sed -n 'w ${APPROVALS}' /tmp/forged"`,
];

test("a record write after a cd inside wrapped text, or through a sed w script, is denied for a spawned agent", (t) => {
  const judge = judgeIn(t);
  for (const command of HIDDEN_RECORD_WRITES) assertRecordDenial(judge(command, { agent: SPAWNED_DEVELOPER }), command);
});

test("the lead's record writes after a cd inside wrapped text or through a sed w script give no decision", (t) => {
  const judge = judgeIn(t);
  for (const command of HIDDEN_RECORD_WRITES) assert.equal(judge(command), null, command);
});

test("the lead's in-place shell write to code under a kernel-owned work entry is denied as code, as before the record check", (t) => {
  const judge = judgeIn(t);
  for (const command of [`sed -i s/a/b/ ${WORK_ITEM}/sources/a.ts`, `node -e "require('fs').writeFileSync('${WORK_ITEM}/test/a.ts','x')"`]) {
    const out = judge(command);
    assert.equal(out?.permissionDecision, "deny", command);
    assert.match(out?.permissionDecisionReason ?? "", /is code; a shell write skips guard\.comments/, command);
  }
});

test("a picket call's verb words are not read as paths, so a drive from inside the state folder is not a record write", (t) => {
  const judge = judgeIn(t);
  const out = judge('cd .picket/state && picket drive --run "ls"', { agent: SPAWNED_DEVELOPER });
  assert.doesNotMatch(out?.permissionDecisionReason ?? "", /kernel record/);
});

const UNSEEN_RECORD_WRITES = [
  'picket drive --run "cp /tmp/a .picket/state/data/appr*"',
  'picket drive --run "echo x >> .picket/state/data/approvals.json?"',
  'picket drive --run "cd ~ && cp a .picket/state/data/approvals.jsonl"',
  'picket drive --run "cd /tmp && cd - && cp a .picket/state/data/approvals.jsonl"',
  'picket drive --run "cd .pick* && cp a state/data/approvals.jsonl"',
  'picket drive --run "cp /tmp/a \$PWD/.picket/state/data/approvals.jsonl"',
  `picket drive --run "touch ${WORK_ITEM}/ph*/1.approved"`,
  'picket drive --run "cp /tmp/a \$(echo .picket)/state/data/approvals.jsonl"',
];

test("a spawned agent's picket-wrapped write through a glob, an expansion or an unknown folder that could reach a record is denied", (t) => {
  const judge = judgeIn(t);
  for (const command of UNSEEN_RECORD_WRITES) assertRecordDenial(judge(command, { agent: SPAWNED_DEVELOPER }), command);
});

test("a spawned agent's picket-wrapped glob that cannot reach a record keeps its decision", (t) => {
  const judge = judgeIn(t);
  for (const command of ['picket drive --run "node --test test/*.test.mjs"', 'picket drive --run "cp out/* .picket/state/scratch/20261119-x/"', 'picket drive --run "cat .picket/state/data/*"']) {
    assert.doesNotMatch(judge(command, { agent: SPAWNED_DEVELOPER })?.permissionDecisionReason ?? "", /kernel record/, command);
  }
});

test("the lead's picket-wrapped writes through a glob, an expansion or an unknown folder give no decision", (t) => {
  const judge = judgeIn(t);
  for (const command of UNSEEN_RECORD_WRITES) assert.equal(judge(command), null, command);
});
