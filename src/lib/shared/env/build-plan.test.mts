import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, realpathSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import type { ItemLayout } from "../repos.mts";
import { contextVersion, overrideDoc, REVISION_LABEL, sourceFor, type ServiceSource } from "./build-plan.mts";
import { readModel, type EnvService } from "./model.mts";

const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };
const ORDERS_DOCKERFILE = "../../.picket/env/docker/orders/Dockerfile";

function app(name: string, context: string, dockerfile: string | null): EnvService {
  return { name, role: "app", build: { context, dockerfile }, image: null, healthcheck: null, ports: [], volumes: [], profiles: [], environment: {}, labels: {} };
}

function umbrellaWithWorktree(t: TestContext): string {
  const root = realpathSync(gitRepo(t, { files: { "services/billing/Billing.csproj": "<Project />\n", ".gitignore": "services/orders/\n" } }));
  const orders = join(root, "services", "orders");
  writeIn(orders, "package.json", "{}\n");
  gitIn(orders, "init", "-q", "-b", "main");
  gitIn(orders, "add", "-A");
  gitIn(orders, "-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", "orders");
  gitIn(orders, "worktree", "add", "-q", "-b", "feat-x", ".worktrees/feat-x");
  return root;
}

test("orders builds from its recorded worktree and billing from the root checkout; an outside Dockerfile becomes absolute (T-5.1)", (t) => {
  const root = umbrellaWithWorktree(t);
  const layout: ItemLayout = { nested: ["services/orders"], worktrees: null, repos: [{ path: "services/orders", base: null, worktree: "services/orders/.worktrees/feat-x" }] };
  const orders = sourceFor(root, layout, app("orders", join(root, "services", "orders"), ORDERS_DOCKERFILE), ENV);
  const worktree = join(root, "services", "orders", ".worktrees", "feat-x");
  assert.deepEqual([orders.checkout, orders.context], [worktree, worktree]);
  assert.equal(orders.dockerfile, resolve(root, ".picket/env/docker/orders/Dockerfile"));
  assert.match(orders.version, /^[0-9a-f]{7}$/);
  const billing = sourceFor(root, layout, app("billing", join(root, "services", "billing"), "Dockerfile"), ENV);
  assert.deepEqual([billing.checkout, billing.context, billing.dockerfile], [root, join(root, "services", "billing"), "Dockerfile"]);
});

test("a clean context is HEAD, an edit adds the tree, undoing it returns to HEAD, and the real index stays empty (T-5.2)", (t) => {
  const root = gitRepo(t, { files: { "svc/a.txt": "one\n", "other.txt": "x\n" } });
  const head7 = gitOut(root, "rev-parse", "HEAD").slice(0, 7);
  const staged = () => gitOut(root, "diff", "--cached", "--name-only");
  assert.equal(contextVersion(root, "svc", ENV), head7);
  assert.equal(staged(), "");
  writeIn(root, "svc/a.txt", "two\n");
  const edited = contextVersion(root, "svc", ENV);
  assert.match(edited, new RegExp(`^${head7}-t[0-9a-f]{7}$`));
  assert.equal(staged(), "");
  writeIn(root, "other.txt", "changed outside the context\n");
  assert.equal(contextVersion(root, "svc", ENV), edited, "a change outside the context leaves the version");
  writeIn(root, "svc/a.txt", "one\n");
  assert.equal(contextVersion(root, "svc", ENV), head7);
  assert.equal(staged(), "");
});

test("a new untracked file in the context changes the version, and the root context compares whole trees", (t) => {
  const root = gitRepo(t, { files: { "a.txt": "one\n" } });
  const head7 = gitOut(root, "rev-parse", "HEAD").slice(0, 7);
  assert.equal(contextVersion(root, "", ENV), head7);
  writeIn(root, "b.txt", "new\n");
  assert.match(contextVersion(root, "", ENV), /-t[0-9a-f]{7}$/);
  rmSync(join(root, "b.txt"));
  assert.equal(contextVersion(root, "", ENV), head7);
});

test("the override tags and labels each app and gives every other started service only the item label (T-5.3)", () => {
  const model = readModel(JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8")));
  const sources: ServiceSource[] = [{ service: "orders", checkout: "/u", context: "/u/services/orders", dockerfile: "/u/.picket/env/docker/orders/Dockerfile", version: "4f2a91c" }];
  const doc = overrideDoc(model, sources, "proj-481", "20261114-orders");
  const item = { "io.github.picketai.item": "20261114-orders" };
  assert.deepEqual(doc.services.orders, {
    image: "picket/orders-proj-481:4f2a91c",
    build: { context: "/u/services/orders", dockerfile: "/u/.picket/env/docker/orders/Dockerfile", labels: { [REVISION_LABEL]: "4f2a91c", ...item } },
    labels: item,
  });
  for (const name of ["payments-mock", "cache", "orders-seed"]) assert.deepEqual(doc.services[name], { labels: item }, name);
  assert.equal(doc.services["billing-db-client"], undefined, "a profile service is not started");
  assert.equal(REVISION_LABEL, "org.opencontainers.image.revision");
});
