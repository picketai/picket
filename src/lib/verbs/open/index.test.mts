import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { instanceTag } from "../../shared/work/send.mts";
import { verb } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";

const parse = (argv: string[], stdin?: () => string) => verb.parse(parseArgs(argv, stdin));

test("open builds its next send for the session that opened the item", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const input = { lane: "order", title: "Sent", id: undefined, request: { text: "add a fee" }, ticket: undefined, story: undefined, source: undefined, session: undefined };
  const outcome = await verb.run(input, fixedContext(root, { session: "S" }));
  assert.ok(outcome.status === "done");
  const { next } = outcome.value;
  assert.equal(next.action, "write_artifact");
  assert.deepEqual(next.send.map((s) => `${s.tool} ${s.to}`), [`Agent ${instanceTag(next.id)}-architect`]);
  assert.match(next.send[0].message, /^request: work\/.*\/request\.md$/m);
});

test("open needs a lane and a title, and takes the request from --text, a file or standard input", () => {
  const base = { lane: "order", title: "Fees", id: undefined, request: null, ticket: undefined, story: undefined, source: undefined, session: undefined };
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees"]), base);
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--text", "add a fee"]).request, { text: "add a fee" });
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--request", "req.md"]).request, { file: "req.md" });
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--request", "-"], () => "piped").request, { text: "piped" });
  assert.throws(() => parse(["--lane", "order"]), (err) => err instanceof UsageError && /needs --lane and --title/.test(err.message));
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--text", ""]), UsageError);
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--request", "-"], () => ""), UsageError);
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--ticket", "SHOP-1"]), UsageError);
});
