import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { findEngine, readModelJson, realRunner } from "../../dist/lib/shared/env/engine.mjs";
import { readModel } from "../../dist/lib/shared/env/model.mjs";

const UMBRELLA = resolve("test/fixtures/env/umbrella");
const RECORDED_ROOT = "/umbrella";
const RECORDED = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8"));

function withRelativeContexts(model, root) {
  const services = model.services.map((service) => (service.build ? { ...service, build: { ...service.build, context: relative(root, service.build.context).replaceAll("\\", "/") } } : service));
  return { ...model, services };
}

test("the live model of the fixture umbrella equals the recorded one (T-2.7)", () => {
  const engine = findEngine(process.env, process.cwd(), realRunner);
  assert.ok(engine, "the env step runs this file only when an engine answers");
  const live = withRelativeContexts(readModel(readModelJson(engine, UMBRELLA)), UMBRELLA);
  const recorded = withRelativeContexts(readModel(RECORDED), RECORDED_ROOT);
  assert.deepEqual(live, recorded);
});
