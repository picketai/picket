import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFindings, buildThreads } from "./threads.mts";
import { postThreads } from "./azdo.mts";
import { parsePullRequestUrl } from "./pull-request.mts";

test("parseFindings keeps the Likelihood and Leave it fields of a cumulative finding in the tail (T-2.4)", () => {
  const block = "## Review: x · cumulative\n\nFindings: 1 major\n- [Major] src/Orders/Fees.cs:42 — the shipping fee ignores the weekend rate. Weekend orders are undercharged. Apply the rate before rounding. Likelihood: medium. Leave it: note in PR.\n\nCHANGES REQUIRED";
  const [f] = parseFindings(block);
  assert.deepEqual([f.severity, f.path, f.line], ["Major", "src/Orders/Fees.cs", 42]);
  assert.equal(f.text, "the shipping fee ignores the weekend rate. Weekend orders are undercharged. Apply the rate before rounding. Likelihood: medium. Leave it: note in PR.");
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
  const threads: any[] = buildThreads(block);
  assert.equal(threads.length, 4);
  assert.deepEqual(threads[3].threadContext, { filePath: "/Orders/Core/Handler.cs", rightFileStart: { line: 113, offset: 1 }, rightFileEnd: { line: 165, offset: 1 } });
  assert.ok(threads[0].comments[0].content.startsWith("**Picket review: CHANGES REQUIRED**"), threads[0].comments[0].content);
  assert.equal(threads[0].status, 1, "active while changes are required");
  assert.deepEqual(threads[1].threadContext, { filePath: "/src/http/handlers.ts", rightFileStart: { line: 42, offset: 1 }, rightFileEnd: { line: 42, offset: 1 } });
  assert.equal(threads[2].threadContext, undefined, "a finding without a line is a general comment");
  const pr = parsePullRequestUrl("https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/7");
  const dry = await postThreads(pr, block, { dryRun: true, pat: null });
  assert.equal(dry.posted, 0);
  assert.equal(dry.threads.length, 4);
  await assert.rejects(postThreads(pr, block, { dryRun: false, pat: null }), /no PAT/);
  await assert.rejects(postThreads(parsePullRequestUrl("https://github.com/a/b/pull/1"), block, { dryRun: true, pat: null }), /Azure DevOps only/);
});
