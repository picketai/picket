import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../util/args.mts";
import { verb } from "./index.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("migrate reads --dry-run and init reads --root and --no-install", () => {
  assert.deepEqual(parse(["--dry-run"]), { dryRun: true });
  assert.deepEqual(parse([]), { dryRun: false });
});
