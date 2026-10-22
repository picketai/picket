import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parsePullRequestUrl, findRemote, locateRepo, fetchPullRequest, parseFindings, buildThreads, postReview, preparePullRequest, patFromEnv } from "../../dist/lib/verbs/pullrequest/pr.mjs";

test("parseFindings keeps the Likelihood and Leave it fields of a cumulative finding in the tail (T-2.4)", () => {
  const block = "## Review: x · cumulative\n\nFindings: 1 major\n- [Major] src/Orders/Fees.cs:42 — the shipping fee ignores the weekend rate. Weekend orders are undercharged. Apply the rate before rounding. Likelihood: medium. Leave it: note in PR.\n\nCHANGES REQUIRED";
  const [f] = parseFindings(block);
  assert.deepEqual([f.severity, f.path, f.line], ["Major", "src/Orders/Fees.cs", 42]);
  assert.equal(f.text, "the shipping fee ignores the weekend rate. Weekend orders are undercharged. Apply the rate before rounding. Likelihood: medium. Leave it: note in PR.");
});

test("parsePullRequestUrl reads Server, Services, legacy and GitHub forms", () => {
  const server = parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/412");
  assert.equal(server.provider, "azdo");
  assert.equal(server.collection_url, "https://tfs.corp.local/tfs/DefaultCollection");
  assert.deepEqual([server.project, server.repo, server.id], ["Shop", "Orders", 412]);
  assert.equal(server.api_base, "https://tfs.corp.local/tfs/DefaultCollection/Shop/_apis/git/repositories/Orders/pullRequests/412");

  const services = parsePullRequestUrl("https://dev.azure.com/acme/Shop/_git/Orders%20Core/pullrequest/12?_a=files");
  assert.equal(services.collection_url, "https://dev.azure.com/acme");
  assert.equal(services.repo, "Orders Core");
  assert.equal(services.api_base, "https://dev.azure.com/acme/Shop/_apis/git/repositories/Orders%20Core/pullRequests/12");

  const legacy = parsePullRequestUrl("https://acme.visualstudio.com/Shop/_git/Orders/pullrequest/3");
  assert.equal(legacy.collection_url, "https://acme.visualstudio.com");

  const gh = parsePullRequestUrl("https://github.com/acme/orders/pull/42");
  assert.deepEqual([gh.provider, gh.owner, gh.repo, gh.id], ["github", "acme", "orders", 42]);

  assert.throws(() => parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders"), /not an Azure DevOps pull request URL/);
  assert.throws(() => parsePullRequestUrl("nope"), /not a URL/);
});

// A bare "server" repo publishing refs/pull/7/merge, and a clone whose remote is named after the real
// Azure DevOps URL but fetches from the bare repo: findRemote matches on the name, fetch stays local.
test("findRemote, fetchPullRequest and preparePullRequest work against a repo that publishes the merge ref", async () => {
  const dir = mkdtempSync(join(tmpdir(), "harness-pr-"));
  const server = join(dir, "Shop", "Orders.git"); // project and repo names in the path, as a real remote URL carries them
  const work = join(dir, "work");
  const g = (cwd, ...a) => execFileSync("git", ["-C", cwd, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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
  assert.equal(r.remote, "origin", r.reason);

  const refs = fetchPullRequest(work, "origin", 7);
  assert.equal(refs.head, merge);
  assert.equal(refs.base, base);
  assert.equal(refs.source, source);

  const prep = await preparePullRequest(pr.url, { root: work, pat: null });
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
  const viaUmbrella = await preparePullRequest(pr.url, { root: umbrella, pat: null });
  assert.equal(viaUmbrella.repo_root, join(umbrella, "src", "Orders"));
  assert.deepEqual(viaUmbrella.summary.changed_files, ["src/b.ts"]);

  assert.throws(() => fetchPullRequest(work, "origin", 8), /could not fetch refs\/pull\/8\/merge/);
  const other = findRemote(work, parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Other/pullrequest/1"));
  assert.equal(other.remote, null);
  assert.match(other.reason, /clone it first/);
  rmSync(dir, { recursive: true, force: true });
});

test("the PAT comes from the environment, else from the untracked local settings env block, else nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-pat-"));
  mkdirSync(join(root, ".claude"));
  assert.equal(patFromEnv({}, root), null);
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ env: { AZDO_PAT: "from-local-settings" } }));
  assert.equal(patFromEnv({}, root), "from-local-settings");
  assert.equal(patFromEnv({ AZDO_PAT: "from-env" }, root), "from-env", "the process environment wins");
  assert.equal(patFromEnv({ AZURE_DEVOPS_EXT_PAT: "az-cli-name" }, "/nonexistent"), "az-cli-name");
  rmSync(root, { recursive: true, force: true });
});

test("a reviewer block becomes one summary thread plus one located thread per finding; dry run posts nothing", async () => {
  const block = `## Review: pr-7 · pr

Changes required: the new handler swallows the repository error.

Alignment: PASS
Findings: 1 critical, 1 minor
- [Critical] src/http/handlers.ts:42 — the catch returns 200 with an empty body. A failed write looks like success to the caller. Rethrow or map to 500.
- [Minor] src/http/handlers.ts — naming: \`tmp\` says nothing. Readers guess. Call it \`draft\`.
- [Major] Orders/Core/Handler.cs:113-165 — the gift-wrap path skips the guard. A cancelled order still starts a shipment. Call the guard after resolving the token.

CHANGES REQUIRED`;
  const f = parseFindings(block);
  assert.equal(f.length, 3);
  assert.deepEqual([f[0].severity, f[0].path, f[0].line], ["Critical", "src/http/handlers.ts", 42]);
  assert.equal(f[1].line, null);
  assert.deepEqual([f[2].line, f[2].end_line], [113, 165], "a line range is accepted");
  const threads = buildThreads(block);
  assert.equal(threads.length, 4);
  assert.deepEqual(threads[3].threadContext, { filePath: "/Orders/Core/Handler.cs", rightFileStart: { line: 113, offset: 1 }, rightFileEnd: { line: 165, offset: 1 } });
  assert.ok(threads[0].comments[0].content.startsWith("**Picket review: CHANGES REQUIRED**"), threads[0].comments[0].content);
  assert.equal(threads[0].status, 1, "active while changes are required");
  assert.deepEqual(threads[1].threadContext, { filePath: "/src/http/handlers.ts", rightFileStart: { line: 42, offset: 1 }, rightFileEnd: { line: 42, offset: 1 } });
  assert.equal(threads[2].threadContext, undefined, "a finding without a line is a general comment");
  const pr = parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/7");
  const dry = await postReview(pr, block, { dryRun: true, pat: null });
  assert.equal(dry.posted, 0);
  assert.equal(dry.threads.length, 4);
  await assert.rejects(postReview(pr, block, { pat: null }), /no PAT/);
  await assert.rejects(postReview(parsePullRequestUrl("https://github.com/a/b/pull/1"), block, { dryRun: true }), /Azure DevOps only/);
});
