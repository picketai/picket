import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./prepare.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("pullrequest prepare needs a url and post needs a url and a file", () => {
  assert.deepEqual(parse(["https://h/pr/1", "--repo", "src/Orders"]), { url: "https://h/pr/1", repo: "src/Orders" });
  assert.throws(() => parse([]), UsageError);
});
