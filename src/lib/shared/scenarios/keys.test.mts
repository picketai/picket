import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import type { EnvModel, EnvService } from "../env/model.mts";
import type { ItemLayout } from "../repos.mts";
import { baseKey, keyId, workingKey } from "./keys.mts";

const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };
const NO_REPOS: ItemLayout = { nested: [], worktrees: null, repos: [] };

function service(name: string, context: string | null, overrides: Partial<EnvService> = {}): EnvService {
  return { name, role: "app", build: context === null ? null : { context, dockerfile: null }, image: null, healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {}, ...overrides };
}

function project(t: TestContext): { root: string; base: string; model: EnvModel } {
  const root = realpathSync(
    gitRepo(t, {
      files: { "services/orders/server.mjs": "ok\n", ".picket/env/compose.yaml": "services: {}\n", ".picket/env/scenarios/S-0001.md": "card\n", "README.md": "x\n" },
    }),
  );
  const model: EnvModel = {
    name: "umbrella",
    services: [service("orders", join(root, "services", "orders")), service("cache", null, { role: "dependency", image: "redis" }), service("seed", join(root, "services", "orders"), { role: "app", profiles: ["picket-data"] })],
    picket: null,
  };
  return { root, base: gitOut(root, "rev-parse", "HEAD"), model };
}

function staged(root: string): string {
  return gitOut(root, "diff", "--cached", "--name-only");
}

test("a clean tree gives equal working and base keys; an app edit changes only that app's tree; the index stays empty (T-3.1)", (t) => {
  const { root, base, model } = project(t);
  const clean = workingKey(root, NO_REPOS, model, ENV);
  assert.equal(staged(root), "");
  const atBase = baseKey(root, NO_REPOS, base, model);
  assert.equal(staged(root), "");
  assert.deepEqual(clean, atBase);
  assert.deepEqual(Object.keys(clean.apps), ["orders"]);
  assert.equal(clean.apps.orders, gitOut(root, "rev-parse", "HEAD:services/orders"));
  writeIn(root, "services/orders/server.mjs", "changed\n");
  const edited = workingKey(root, NO_REPOS, model, ENV);
  assert.equal(staged(root), "");
  assert.notEqual(edited.apps.orders, clean.apps.orders);
  assert.equal(edited.env, clean.env);
  writeIn(root, "README.md", "outside every context\n");
  assert.deepEqual(workingKey(root, NO_REPOS, model, ENV), edited);
});

test("the env part ignores the scenario folder and follows the rest of .picket/env (T-3.2)", (t) => {
  const { root, base, model } = project(t);
  const clean = workingKey(root, NO_REPOS, model, ENV);
  assert.equal(clean.env, baseKey(root, NO_REPOS, base, model).env);
  writeIn(root, ".picket/env/scenarios/S-0002.md", "another card\n");
  writeIn(root, ".picket/env/scenarios/S-0001.md", "edited card\n");
  assert.equal(workingKey(root, NO_REPOS, model, ENV).env, clean.env);
  writeIn(root, ".picket/env/compose.yaml", "services: { orders: {} }\n");
  assert.notEqual(workingKey(root, NO_REPOS, model, ENV).env, clean.env);
  assert.equal(staged(root), "");
});

test("an app missing at the base, or an item with no base commit, gets null for its base tree (T-3.3)", (t) => {
  const { root, base, model } = project(t);
  writeIn(root, "services/billing/app.cs", "class Billing {}\n");
  const withBilling: EnvModel = { ...model, services: [...model.services, service("billing", join(root, "services", "billing"))] };
  assert.deepEqual(baseKey(root, NO_REPOS, base, withBilling).apps, { orders: gitOut(root, "rev-parse", "HEAD:services/orders"), billing: null });
  assert.match(workingKey(root, NO_REPOS, withBilling, ENV).apps.billing ?? "", /^[0-9a-f]{40}$/);
  assert.deepEqual(baseKey(root, NO_REPOS, null, model).apps, { orders: null });
});

test("the key id ignores the order of the apps and changes with any tree (T-3.3)", () => {
  const id = keyId({ env: "e", apps: { orders: "a", billing: null } });
  assert.equal(keyId({ env: "e", apps: { billing: null, orders: "a" } }), id);
  assert.match(id, /^[0-9a-f]{12}$/);
  assert.notEqual(keyId({ env: "e", apps: { billing: "b", orders: "a" } }), id);
  assert.notEqual(keyId({ env: "f", apps: { orders: "a", billing: null } }), id);
});

test("a nested repository's base tree is read at the base its layout records", (t) => {
  const { root, base, model } = project(t);
  writeIn(root, ".gitignore", "services/billing/\n");
  const billing = join(root, "services", "billing");
  writeIn(billing, "app.cs", "class Billing {}\n");
  gitIn(billing, "init", "-q", "-b", "main");
  gitIn(billing, "add", "-A");
  gitIn(billing, "commit", "-q", "-m", "billing");
  const layout: ItemLayout = { nested: ["services/billing"], worktrees: null, repos: [{ path: "services/billing", base: gitOut(billing, "rev-parse", "HEAD") }] };
  const withBilling: EnvModel = { ...model, services: [...model.services, service("billing", billing)] };
  const tree = gitOut(billing, "rev-parse", "HEAD^{tree}");
  assert.equal(baseKey(root, layout, base, withBilling).apps.billing, tree);
  assert.equal(workingKey(root, layout, withBilling, ENV).apps.billing, tree);
});
