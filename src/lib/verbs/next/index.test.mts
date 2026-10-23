import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("next reads an id, or --latest with an optional session, and nothing else (T-4.4)", () => {
  assert.deepEqual(parse([ID]), { id: ID });
  assert.deepEqual(parse(["--latest"]), { latest: true, session: undefined });
  assert.deepEqual(parse(["--latest", "--session", "s-1"]), { latest: true, session: "s-1" });
  assert.throws(() => parse([]), UsageError);
});
