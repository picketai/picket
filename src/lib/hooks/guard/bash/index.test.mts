import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { statePath, stateRel, STATE_FILES } from "../../../shared/paths.mts";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const project = (t: TestContext) => withProject(t, { host: true, picket: false });

function traceRows(root: string): { outcome: string; tool: string }[] {
  return readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("guardBash called directly decides, falls through, and traces once per call (T-7.2)", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "Bash" });
  assert.equal(decide("rm -rf x"), "deny");
  assert.equal(decide("git status"), "allow");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "git status --short" } }));
  assert.equal(decide(`npm test > ${stateRel("p.log")} 2>&1`), "allow");
  assert.equal(decide("cat a > b"), null);
  const trace = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n");
  assert.equal(trace.length, 4);
  assert.deepEqual(trace.map((l) => JSON.parse(l).outcome), ["deny", "allow", "allow", "fallthrough:write-redirect"]);
});

test("a destructive command denies under both the Bash and the PowerShell tool", (t) => {
  const root = project(t);
  for (const tool of ["Bash", "PowerShell"]) {
    for (const command of ["git push origin trunk", "git reset --hard", "rm -rf build", "git -C sub push"]) {
      assert.equal(decision(command, { root, tool }), "deny", `${tool}: ${command}`);
    }
  }
});

test("guardBash never allows under PowerShell, while Bash keeps its allows and an unnamed tool reads as Bash", (t) => {
  const root = project(t);
  for (const command of ["Get-ChildItem", "git status", "picket state x"]) {
    assert.equal(decision(command, { root, tool: "PowerShell" }), null, command);
    assert.equal(decision(command, { root, tool: "Bash" }), "allow", command);
  }
  assert.equal(decision("git status", { root }), "allow");
  const rows = traceRows(root);
  assert.deepEqual(rows.map((r) => r.tool), ["PowerShell", "Bash", "PowerShell", "Bash", "PowerShell", "Bash", "Bash"]);
  assert.equal(rows[0].outcome, "fallthrough:powershell:[safe]");
});

test("guardBash allows a compound of read-only pieces and bare picket calls that wrap nothing", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "Bash" });
  assert.equal(decide("picket next x; cat work/x/order.md | head -40"), "allow");
  assert.equal(decide("cd sub && picket state x 2>&1"), "allow");
  assert.equal(decide("picket state x"), "allow", "a lone read-only picket call stands alone");
  assert.equal(decide("picket route x --verdict APPROVED --agent user"), null, "a lone mutating picket call is left to the project's allow rule");

  assert.equal(decide('API_KEY=k picket drive --hit "GET /h"'), null);
  assert.equal(decide("node dist/bin/picket.mjs next x; ls"), null);
  assert.equal(decide("/usr/local/bin/picket next x; ls"), null);
  assert.equal(decide('picket drive --run "npm start"; ls'), null);

  assert.equal(decide("picket next x > out.txt"), null);
  assert.equal(decide('picket admit --text "$(whoami)"'), null);
  assert.equal(decide('picket drive --run "rm -rf src"'), "deny");
});

test("guardBash allows a lone read-only picket verb and leaves a mutating one to the allow rule", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "Bash" });

  for (const command of ["picket verify 20261012-touring-deleteorder-blank-input-returns-500 1", "picket state x", "picket next x", "picket packet x", "picket summary x", "picket extension list", "picket source grep analysis foo", "picket source find analysis Foo", "picket verify x 1 2>&1 | tail -20"]) {
    assert.equal(decide(command), "allow", command);
  }

  for (const command of ["picket route x --verdict APPROVED --agent user", "picket set x status=done", "picket open --lane fast --title t", "picket extension add local", "picket source add x ref", "picket source pick x", "picket source", "picket pullrequest post https://h/pr/1 --file f.md", "picket pullrequest prepare https://h/pr/1", "picket style apply", "picket constructor x", 'picket drive --run "node .picket/state/scratch/drive-x.mjs" 2>&1 | tail -20']) {
    assert.equal(decide(command), null, command);
  }
  assert.equal(decide("picket next x; ls"), "allow");
});

test("guardBash allows a lone picket verify only when the test command it would run is itself safe", (t) => {
  const root = project(t);
  const decide = (command: string) => decision(command, { root, tool: "Bash" });
  const decideIn = (cwd: string, command: string) => decision(command, { root, cwd });
  assert.equal(decide("picket verify x 1"), "allow");
  assert.equal(decideIn(join(root, "..", "other"), "picket verify x 1"), null);
  assert.equal(decideIn(join(root, "sub"), "picket verify x 1"), null);
  assert.equal(decideIn(join(root, "..", "other"), "picket verify x 1 --no-tests"), "allow");

  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "node scripts/test.mjs" } }));
  assert.equal(decide("picket verify x 1"), null);
  assert.equal(decide("cd sub && picket verify x 1"), null);
  assert.equal(decide("picket next x; picket verify x 1"), null);
  assert.equal(decide("cd sub && picket verify x 1 --no-tests"), "allow");
  assert.equal(decide(`picket verify x 1 --root ${join(root, "other")}`), null);
  assert.equal(decide("picket verify x 1 --no-tests"), "allow");

  mkdirSync(join(root, ".picket"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, commands: { test: "dotnet test" } }));
  assert.equal(decide("picket verify x 1"), "allow");
});

test("guardBash never allows a heredoc redirect into an extension file", (t) => {
  const root = project(t);
  const command = "cat > .picket/extensions/x/rules/a.md <<'EOF'\nUse pnpm.\nEOF";
  assert.notEqual(decision(command, { root, tool: "Bash" }), "allow");
});
