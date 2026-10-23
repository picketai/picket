import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parsePullRequestUrl, patOf } from "./pull-request.mts";
import { withProject } from "#test/project.mts";

test("parsePullRequestUrl reads Server, Services, legacy and GitHub forms", () => {
  const server: any = parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/412");
  assert.equal(server.provider, "azdo");
  assert.equal(server.collection_url, "https://tfs.corp.local/tfs/DefaultCollection");
  assert.deepEqual([server.project, server.repo, server.id], ["Shop", "Orders", 412]);
  assert.equal(server.api_base, "https://tfs.corp.local/tfs/DefaultCollection/Shop/_apis/git/repositories/Orders/pullRequests/412");

  const services: any = parsePullRequestUrl("https://dev.azure.com/acme/Shop/_git/Orders%20Core/pullrequest/12?_a=files");
  assert.equal(services.collection_url, "https://dev.azure.com/acme");
  assert.equal(services.repo, "Orders Core");
  assert.equal(services.api_base, "https://dev.azure.com/acme/Shop/_apis/git/repositories/Orders%20Core/pullRequests/12");

  const legacy: any = parsePullRequestUrl("https://acme.visualstudio.com/Shop/_git/Orders/pullrequest/3");
  assert.equal(legacy.collection_url, "https://acme.visualstudio.com");

  const gh: any = parsePullRequestUrl("https://github.com/acme/orders/pull/42");
  assert.deepEqual([gh.provider, gh.owner, gh.repo, gh.id], ["github", "acme", "orders", 42]);

  assert.throws(() => parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders"), /not an Azure DevOps pull request URL/);
  assert.throws(() => parsePullRequestUrl("nope"), /not a URL/);
});

test("the PAT comes from the environment, else from the untracked local settings env block, else nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  assert.equal(patOf({}, root), null);
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ env: { AZDO_PAT: "from-local-settings" } }));
  assert.equal(patOf({}, root), "from-local-settings");
  assert.equal(patOf({ AZDO_PAT: "from-env" }, root), "from-env", "the process environment wins");
  assert.equal(patOf({ AZURE_DEVOPS_EXT_PAT: "az-cli-name" }, "/nonexistent"), "az-cli-name");
});
