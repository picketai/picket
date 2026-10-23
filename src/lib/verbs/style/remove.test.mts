import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./remove.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("style apply checks --only against the components and style remove needs --all for a dry run", () => {
  assert.deepEqual(parse(["--all", "--dry-run"]), { all: true, dryRun: true, yes: false });
  assert.deepEqual(parse(["--yes"]), { all: false, dryRun: false, yes: true });
  assert.throws(() => parse(["--dry-run"]), UsageError);
});
