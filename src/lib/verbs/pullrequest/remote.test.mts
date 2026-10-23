import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parsePullRequestUrl } from "./pull-request.mts";
import { findRemote, locateRepo, fetchPullRequest } from "./remote.mts";
import { preparePullRequest } from "./prepare.mts";
import { withProject } from "#test/project.mts";

const PREPARE = { repo: undefined, pat: null, env: process.env };

// A bare "server" repo publishing refs/pull/7/merge, and a clone whose remote is named after the real
// Azure DevOps URL but fetches from the bare repo: findRemote matches on the name, fetch stays local.
test("findRemote, fetchPullRequest and preparePullRequest work against a repo that publishes the merge ref", async (t) => {
  const dir = withProject(t, { picket: false });
  const server = join(dir, "Shop", "Orders.git"); // project and repo names in the path, as a real remote URL carries them
  const work = join(dir, "work");
  const g = (cwd: string, ...a: string[]) => execFileSync("git", ["-C", cwd, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  mkdirSync(join(dir, "Shop"));
  execFileSync("git", ["init", "-q", "--bare", server]);
  execFileSync("git", ["init", "-q", "-b", "main", work]);
  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "orders", devDependencies: { typescript: "5" } }));
  mkdirSync(join(work, "src"));
  writeFileSync(join(work, "src", "a.ts"), "export const a = 1;\n");
  g(work, "add", "-A");
  g(work, "commit", "-q", "-m", "base");
  const base = g(work, "rev-parse", "HEAD");
  g(work, "checkout", "-q", "-b", "feature");
  writeFileSync(join(work, "src", "b.ts"), "export const b = 2;\n");
  g(work, "add", "-A");
  g(work, "commit", "-q", "-m", "add b");
  const source = g(work, "rev-parse", "HEAD");
  g(work, "checkout", "-q", "main");
  g(work, "merge", "-q", "--no-ff", "--no-edit", "feature");
  const merge = g(work, "rev-parse", "HEAD");
  g(work, "reset", "-q", "--hard", base); // main goes back; the merge lives only under the PR ref on the server
  g(work, "remote", "add", "origin", `https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders`);
  g(work, "remote", "set-url", "origin", server); // fetchable locally; the name match is what findRemote checks
  g(work, "push", "-q", server, `${merge}:refs/pull/7/merge`);

  const pr = parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/7");
  const r = findRemote(work, pr);
  assert.equal(r.remote, "origin", "reason" in r ? r.reason : undefined);

  const refs = fetchPullRequest(work, "origin", 7);
  assert.equal(refs.head, merge);
  assert.equal(refs.base, base);
  assert.equal(refs.source, source);

  const prep: any = await preparePullRequest(work, pr.url, PREPARE);
  assert.equal(prep.review_id, "pr-7");
  assert.deepEqual(prep.summary.changed_files, ["src/b.ts"]);
  assert.equal(prep.summary.size, "small");
  assert.deepEqual(prep.summary.frameworks, ["typescript"]);
  assert.equal(prep.meta, null);
  assert.match(prep.meta_reason, /no PAT/);

  // an umbrella whose src/Orders is the clone: the kernel finds the nested repository on its own
  const umbrella = join(dir, "umbrella");
  mkdirSync(join(umbrella, "src"), { recursive: true });
  execFileSync("git", ["init", "-q", umbrella]);
  execFileSync("git", ["clone", "-q", "--origin", "origin", server, join(umbrella, "src", "Orders")]);
  g(join(umbrella, "src", "Orders"), "remote", "set-url", "origin", server);
  const nested = locateRepo(umbrella, pr);
  assert.equal(nested.repo_root, join(umbrella, "src", "Orders"));
  const viaUmbrella: any = await preparePullRequest(umbrella, pr.url, PREPARE);
  assert.equal(viaUmbrella.repo_root, join(umbrella, "src", "Orders"));
  assert.deepEqual(viaUmbrella.summary.changed_files, ["src/b.ts"]);

  assert.throws(() => fetchPullRequest(work, "origin", 8), /could not fetch refs\/pull\/8\/merge/);
  const other = findRemote(work, parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Other/pullrequest/1"));
  assert.equal(other.remote, null);
  assert.match(other.reason ?? "", /clone it first/);
});
