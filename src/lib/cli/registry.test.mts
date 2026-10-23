import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REGISTRY } from "./registry.mts";
import { listCommands, VERB_NAMES } from "../verbs.mts";

const OUTPUTS = ["json", "text"];
const STATIC_VERB_IMPORT = /\bfrom\s*["']\.\.\/verbs\//;

function summaryOf(command: string): string {
  const [name, sub] = command.split(" ");
  const entry: any = VERB_NAMES[name as keyof typeof VERB_NAMES];
  return sub === undefined ? entry.summary : entry.subverbs[sub].summary;
}

test("the registry has exactly one loader per command VERB_NAMES lists (RISK-002)", () => {
  assert.deepEqual(Object.keys(REGISTRY).sort(), [...listCommands()].sort());
});

test("each loader gives a spec whose usage starts with its command, with a known output and a summary (RISK-002)", async () => {
  for (const command of listCommands()) {
    const { verb }: { verb: any } = await REGISTRY[command]();
    assert.ok(verb.usage.startsWith(command), `${command}: ${verb.usage}`);
    assert.ok(OUTPUTS.includes(verb.output), `${command}: ${verb.output}`);
    assert.ok(summaryOf(command).trim(), `${command} has no summary`);
    for (const part of ["parse", "run", "render"]) assert.equal(typeof verb[part], "function", `${command}.${part}`);
  }
});

test("the CLI loads verb modules only on demand: main and the registry import no verbs/ module statically", () => {
  for (const file of ["src/lib/cli/main.mts", "src/lib/cli/registry.mts"]) {
    assert.doesNotMatch(readFileSync(resolve(file), "utf8"), STATIC_VERB_IMPORT, file);
  }
  assert.match('import { verb } from "../verbs/leave/index.mjs";', STATIC_VERB_IMPORT);
  assert.doesNotMatch('leave: () => import("../verbs/leave/index.mjs")', STATIC_VERB_IMPORT);
});
