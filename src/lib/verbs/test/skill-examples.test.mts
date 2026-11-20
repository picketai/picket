import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs, UsageError, type Args } from "../../util/args.mts";
import { parse } from "../../util/vendor/shell-quote-parse.mjs";
import { verb as ask } from "./ask.mts";
import { verb as classify } from "./classify.mts";
import { verb as note } from "./note.mts";
import { verb as defect } from "./defect.mts";
import { STEP_WORDS } from "../../shared/scenarios/format.mts";
import { caseCard } from "../../shared/testing/cases.mts";

const STEPS = resolve("src/skills/testing/steps");
const ID = "20261118-example";
const VERBS: ReadonlyMap<string, { parse: (args: Args) => object }> = new Map<string, { parse: (args: Args) => object }>([
  ["note", note],
  ["classify", classify],
  ["ask", ask],
  ["defect", defect],
]);
const FREE_TEXT_FLAGS = ["why", "evidence", "question", "basis", "intent"];
const DEFECT_STEPS = "request GET {orders}/orders\nexpect status 400\n";
const INLINE_COMMAND = /`(picket test (?:note|classify|ask|defect) <id> [^`]*)`/g;
const FENCED_COMMAND = /^\s*(picket test (?:note|classify|ask|defect) <id> .*)$/gm;

type Example = { file: string; line: string };
type Written = { text: string; quoted: boolean };

function stepExamples(): Example[] {
  return readdirSync(STEPS)
    .filter((name) => name.endsWith(".md"))
    .flatMap((name) => {
      const text = readFileSync(join(STEPS, name), "utf8").replace(/\r\n/g, "\n");
      const lines = [...text.matchAll(INLINE_COMMAND), ...text.matchAll(FENCED_COMMAND)].map((match) => match[1].trim());
      return lines.map((line) => ({ file: name, line }));
    });
}

function verbOf(line: string): string {
  return line.split(" ")[2];
}

function shellWords(line: string): string[] {
  return parse(line.replace("<id>", ID)).map((entry) => {
    if (typeof entry !== "string") throw new Error(`the shell reads ${JSON.stringify(entry)} in: ${line}`);
    return entry;
  });
}

function parsedInput(line: string): object {
  const [, , verbName, ...words] = shellWords(line);
  const spec = VERBS.get(verbName);
  if (!spec) throw new Error(`no test verb ${verbName}`);
  return spec.parse(parseArgs(words, () => DEFECT_STEPS));
}

function writtenText(line: string, flag: string): Written | undefined {
  const quoted = new RegExp(`--${flag} "([^"]*)"`).exec(line);
  if (quoted) return { text: quoted[1], quoted: true };
  const bare = new RegExp(`--${flag} (.*?)(?= --|$)`).exec(line);
  return bare ? { text: bare[1], quoted: false } : undefined;
}

function fieldOf(input: object, field: string): unknown {
  return Object.entries(input).find(([key]) => key === field)?.[1];
}

function exampleProblems(line: string): string[] {
  const input = parsedInput(line);
  return FREE_TEXT_FLAGS.flatMap((flag) => {
    const written = writtenText(line, flag);
    if (!written) return [];
    const parsed = fieldOf(input, flag);
    const problems = written.quoted ? [] : [`--${flag} text is not in double quotes`];
    if (parsed !== written.text) problems.push(`--${flag} parsed as ${JSON.stringify(parsed)}, the line gives ${JSON.stringify(written.text)}`);
    return problems;
  });
}

test("the testing steps show at least one note, one classify, one ask and one defect command", () => {
  const verbs = new Set(stepExamples().map((example) => verbOf(example.line)));
  assert.deepEqual([...verbs].sort(), ["ask", "classify", "defect", "note"]);
});

test("every note, classify, ask and defect command in the testing steps parses with its free text whole and quoted", () => {
  for (const { file, line } of stepExamples()) {
    assert.deepEqual(exampleProblems(line), [], `${file}: ${line}`);
  }
});

test("the unquoted note the benchmark tester ran is refused", () => {
  assert.throws(() => exampleProblems("picket test note <id> T-1.1 permission not-run --why the request names no roles or login"), UsageError);
});

test("the unquoted classify the benchmark tester ran is refused", () => {
  assert.throws(() => exampleProblems("picket test classify <id> C-01 product --evidence POST /orders answered 500"), UsageError);
});

test("an unquoted ask question is refused", () => {
  assert.throws(() => exampleProblems('picket test ask <id> T-2.1 --question Is an order with an empty basket an error --choices "yes, refuse it | no, store it as a draft"'), UsageError);
});

const CASES_STEP = join(STEPS, "cases.md");
const FENCE = /^(\s*)```/;
const CASE_SPEC = { criterion: "T-1.1", kind: "normal" as const, intent: "the example card reads back" };

function fencedBlocks(text: string): string[] {
  const blocks: string[] = [];
  let open: { indent: number; lines: string[] } | null = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const fence = FENCE.exec(line);
    if (fence && open === null) open = { indent: fence[1].length, lines: [] };
    else if (fence && open !== null) {
      blocks.push(`${open.lines.join("\n")}\n`);
      open = null;
    } else open?.lines.push(line.slice(open.indent));
  }
  return blocks;
}

function cardBlocks(text: string): string[] {
  return fencedBlocks(text).filter((block) => (STEP_WORDS as readonly string[]).includes(block.trimStart().split(/\s/, 1)[0]));
}

function blockProblems(block: string): string[] {
  const built = caseCard(ID, CASE_SPEC, block);
  return "problems" in built ? built.problems : [];
}

test("every step block of the cases step parses as a case card, a mixed browser one included (T-3.3)", () => {
  const blocks = cardBlocks(readFileSync(CASES_STEP, "utf8"));
  assert.ok(blocks.length >= 2, `${blocks.length} step blocks`);
  for (const block of blocks) assert.deepEqual(blockProblems(block), [], block);
  const words = new Set(blocks.flatMap((block) => block.split("\n").map((line) => line.split(" ", 1)[0])));
  assert.deepEqual(["request", "open", "fill", "click", "see"].filter((word) => !words.has(word)), []);
});

test("a step block holding an unknown word gives a problem naming it (T-3.3)", () => {
  const text = ["Text.", "", "   ```", "   open {web}/login", '   press "Sign in"', "   ```", "", "```", "picket test case <id>", "```", ""].join("\n");
  const blocks = cardBlocks(text);
  assert.deepEqual(blocks, ['open {web}/login\npress "Sign in"\n']);
  assert.deepEqual(blockProblems(blocks[0]), ['step 2: unknown step word "press"']);
});
