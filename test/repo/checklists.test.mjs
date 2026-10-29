import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CHECKLISTS_DIR = "src/skills/reviewing/checklists";
const HEADER = "| # | Check | Fail condition | Severity |";
const SEPARATOR = /^\|[-| ]+\|$/;
const CELL_SEPARATOR = " | ";
const BANNED = /\b(no comment|or comment|documented)\b/i;

function cellsOf(row) {
  return row.slice(2, -2).split(CELL_SEPARATOR);
}

function failConditions(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    if (line === HEADER) inTable = true;
    else if (!line.startsWith("|")) inTable = false;
    else if (inTable && !SEPARATOR.test(line)) {
      const [id, , condition] = cellsOf(line);
      rows.push({ id, condition });
    }
  }
  return rows;
}

function bannedRows(file, text) {
  return failConditions(text)
    .filter(({ condition }) => BANNED.test(condition))
    .map(({ id }) => `${file}: ${id}`);
}

test("no fail condition passes a construct on a comment or on documentation", () => {
  const files = readdirSync(CHECKLISTS_DIR).filter((name) => name.endsWith(".md"));
  assert.deepEqual(files.flatMap((file) => bannedRows(file, readFileSync(join(CHECKLISTS_DIR, file), "utf8"))), []);
});

test("the ban flags a comment-excused row by id and lets a comment-only catch body through", () => {
  const table = [
    HEADER,
    "|---|---|---|---|",
    "| T9 | Non-null assertion | `!` with no earlier null check and with no comment saying why | Major |",
    "| E1 | Swallowed error | A `catch` body is empty, holds only a comment, or returns a value the return type cannot tell from success, with no logging or rethrow | Critical |",
  ].join("\n");
  assert.deepEqual(bannedRows("fixture.md", table), ["fixture.md: T9"]);
});

test("rows outside a fail condition table are not read", () => {
  const prose = ["| Cell | Meaning |", "|---|---|", "| X | no comment needed |"].join("\n");
  assert.deepEqual(failConditions(prose), []);
});
