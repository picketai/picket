import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { action, done } from "../../shared/action.mts";
import { listScenarios } from "../../shared/scenarios/files.mts";
import { compileBrief } from "../../shared/testing/brief.mts";
import { openTestItem, testBriefPath, testFacts } from "../../shared/testing/facts.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { flag, UsageError, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";

export type BriefInput = { id: WorkId; save: boolean };

export const brief = action<BriefInput, string>(async ({ id, save }, { root }) => {
  const { snap } = openTestItem(root, id);
  const texts = { request: readText(workFile(root, id, "request.md")), story: readText(workFile(root, id, "story.md")) };
  const text = compileBrief(snap, testFacts(root, snap), listScenarios(root), texts);
  if (save) {
    const path = testBriefPath(root, id);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return done(text);
});

function parseBrief(args: Args): BriefInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("test brief needs <id>");
  return { id: workId(id), save: flag(args, "save") };
}

export const verb: VerbSpec<BriefInput, string> = {
  usage: "test brief <id> [--save]",
  output: "text",
  parse: parseBrief,
  run: brief,
  render: (text) => text.trimEnd(),
};
