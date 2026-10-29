import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("name parses a kind and subject, or a work kind with --work", () => {
  assert.deepEqual(parse(["report", "invoice pricing"]), { kind: "report", subject: "invoice pricing", work: undefined });
  assert.deepEqual(parse(["design", "--work", "20261029-x"]), { kind: "design", subject: undefined, work: "20261029-x" });
});

test("name refuses a missing kind, an unknown kind, design without --work and report with --work", () => {
  assert.throws(() => parse([]), /name needs <kind>/);
  assert.throws(() => parse(["adr", "pricing"]), /"adr" is not a document kind/);
  assert.throws(() => parse(["design"]), /design needs --work <id>/);
  assert.throws(() => parse(["report", "pricing", "--work", "20261029-x"]), UsageError);
});

test("name prints the path alone, then with an exists line once the file is there", async (t) => {
  const root = withProject(t);
  const request = parse(["report", "Report on invoice pricing"]);
  const absent = await verb.run(request, fixedContext(root));
  assert.equal(absent.status === "done" && verb.render(absent.value), "artifacts/reports/report-invoice-pricing.md");
  mkdirSync(join(root, "artifacts", "reports"), { recursive: true });
  writeFileSync(join(root, "artifacts", "reports", "report-invoice-pricing.md"), "# r\n");
  const present = await verb.run(request, fixedContext(root));
  assert.equal(present.status === "done" && verb.render(present.value), "artifacts/reports/report-invoice-pricing.md\nexists");
});
