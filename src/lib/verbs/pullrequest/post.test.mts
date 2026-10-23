import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./post.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("pullrequest prepare needs a url and post needs a url and a file", () => {
  assert.deepEqual(parse(["https://h/pr/1", "--file", "r.md", "--dry-run"]), { url: "https://h/pr/1", file: "r.md", dryRun: true });
  assert.throws(() => parse(["https://h/pr/1"]), (err) => err instanceof UsageError && err.message.includes("--file"));
});
