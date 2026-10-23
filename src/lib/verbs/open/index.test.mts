import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const parse = (argv: string[], stdin?: () => string) => verb.parse(parseArgs(argv, stdin));

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
