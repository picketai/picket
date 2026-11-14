import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { describeExit, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { gitIn, gitRepo } from "#test/git.mts";
import { openItem } from "#test/project.mts";
import { parseArgs } from "../../util/args.mts";
import { renderStart, startEnvironment, verb, type StartReport } from "./start.mts";

const RECORDED = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };

type Engine = { runner: EngineRunner; calls: string[] };

const VALUE_FLAGS = ["-p", "--project-directory", "-f", "--profile"];

function modelAt(root: string): string {
  return RECORDED.replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`);
}

function engine(root: string, { revision }: { revision?: string } = {}): Engine {
  const calls: string[] = [];
  const runner: EngineRunner = (_program, args) => {
    const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
    const call = words.join(" ");
    if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (call === "compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    calls.push(words.slice(0, 2).join(" "));
    if (call === "compose config --profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (words[1] === "config") return { status: 0, stdout: modelAt(root), stderr: "" };
    if (words[0] === "image") {
      const tag = words[2].slice(words[2].lastIndexOf(":") + 1);
      return { status: 0, stdout: JSON.stringify([{ Config: { Labels: { "org.opencontainers.image.revision": revision ?? tag } } }]), stderr: "" };
    }
    if (words[1] === "port") return { status: 0, stdout: "0.0.0.0:49153\n", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  return { runner, calls };
}

function project(t: TestContext): { ctx: Context; id: WorkId } {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  const { id } = openItem(root, { lane: "order", title: "Orders export", source: "PROJ-481" });
  const ctx: Context = { root, cwd: root, now: () => new Date("2026-11-14T10:00:00Z"), env: ENV, home: root, session: "session-1", platform: process.platform };
  return { ctx, id };
}

function refusal(run: () => unknown): string {
  try {
    run();
  } catch (err) {
    assert.ok(err instanceof Refused, String(err));
    return err.message;
  }
  assert.fail("not refused");
}

test("env start needs an id", () => {
  assert.throws(() => verb.parse(parseArgs([])), /env start needs <id>/);
  assert.equal(verb.output, "text");
});

test("start runs build, image inspect, up, then port, and records the stack with the session (T-5.4)", (t) => {
  const { ctx, id } = project(t);
  const { runner, calls } = engine(ctx.root);
  const outcome = startEnvironment(ctx, runner, id);
  assert.equal(describeExit(outcome).code, 0);
  assert.deepEqual(
    calls.filter((c) => !c.endsWith("config")),
    ["compose build", "image inspect", "compose up", "compose port", "compose port"],
  );
  const report = describeExit(outcome).json as StartReport;
  assert.equal(report.stack, "picket-proj-481");
  assert.deepEqual(report.urls, { PICKET_URL_ORDERS: "http://127.0.0.1:49153", PICKET_URL_PAYMENTS_MOCK: "http://127.0.0.1:49153" });
  const recorded = readStacks(ctx.root)["picket-proj-481"];
  assert.deepEqual([recorded.item, recorded.session, recorded.started, recorded.engine], [id, "session-1", "2026-11-14T10:00:00.000Z", { name: "docker", program: "docker", prefix: [] }]);
  assert.deepEqual(recorded.files, [join(ctx.root, ".picket", "env", "compose.yaml"), join(ctx.root, ".picket", "state", "env", "picket-proj-481", "compose.picket.yaml")]);
  const lines = renderStart(report).split("\n");
  assert.match(lines[1], /^orders · built from \. at [0-9a-f]{7}(?:-t[0-9a-f]{7})?$/);
  assert.ok(lines.includes("PICKET_URL_ORDERS=http://127.0.0.1:49153"));
});

test("an image whose revision label differs refuses before up and records no stack (T-5.4)", (t) => {
  const { ctx, id } = project(t);
  const { runner, calls } = engine(ctx.root, { revision: "0000000" });
  assert.match(refusal(() => startEnvironment(ctx, runner, id)), /^picket\/orders-proj-481:\S+ was not built from \S+$/);
  assert.ok(!calls.includes("compose up"));
  assert.deepEqual(readStacks(ctx.root), {});
});

test("a done item and an environment with a rule error refuse before any build", (t) => {
  const done = project(t);
  writeState(done.ctx.root, { ...readState(done.ctx.root, done.id), status: "done" }, new Date());
  const first = engine(done.ctx.root);
  assert.match(refusal(() => startEnvironment(done.ctx, first.runner, done.id)), /is done; env start runs only for an open or blocked item$/);
  assert.ok(!first.calls.includes("compose build"));
  const broken = project(t);
  const model = JSON.parse(modelAt(broken.ctx.root));
  model.services.cache.image = "busybox:1.36";
  const second = engine(broken.ctx.root);
  const runner: EngineRunner = (program, args) => (args.includes("json") && args.includes("--profile") ? { status: 0, stdout: JSON.stringify(model), stderr: "" } : second.runner(program, args));
  assert.equal(refusal(() => startEnvironment(broken.ctx, runner, broken.id)), "the environment fails E6; run picket env check");
});

test("no engine fails with the install line and starts nothing", (t) => {
  const { ctx, id } = project(t);
  const outcome = startEnvironment(ctx, () => ({ status: 1, stdout: "", stderr: "" }), id);
  assert.equal(describeExit(outcome).code, 2);
  assert.equal(renderStart(describeExit(outcome).json as StartReport), "missing: no container engine: install Docker or Podman");
});
