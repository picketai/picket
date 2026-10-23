import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./apply.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("style apply checks --only against the components and style remove needs --all for a dry run", () => {
  assert.deepEqual(parse(["--only", "font,statusline", "--dry-run"]), { only: ["font", "statusline"], dryRun: true, yes: false });
  assert.deepEqual(parse(["--yes"]), { only: null, dryRun: false, yes: true });
  assert.throws(() => parse(["--only", "bogus"]), (err) => err instanceof UsageError && /"bogus"/.test(err.message) && /statusline/.test(err.message));
});
