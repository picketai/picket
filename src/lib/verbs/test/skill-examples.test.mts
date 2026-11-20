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
