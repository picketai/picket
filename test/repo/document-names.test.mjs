import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_KINDS, documentRel } from "../../dist/lib/shared/document-path.mjs";

const REGISTRY = "src/skills/documenting/SKILL.md";
const SAMPLE = { subject: "pricing rules", slug: "pricing-rules", work: "20261029-x", sequence: 1, sequenceText: "00001" };
const FIRST_PATH = /`([^`]+)`/;

function registryRows(text) {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter(([kind]) => DOCUMENT_KINDS.includes(kind));
}

function livesAt(cells) {
  return FIRST_PATH.exec(cells.at(-1))?.[1] ?? "";
}

function sampled(template) {
  return template.replaceAll("<slug>", SAMPLE.slug).replaceAll("<id>", SAMPLE.work).replaceAll("NNNNN", SAMPLE.sequenceText);
}

function expectedPath(kind) {
  return kind === "order" || kind === "design" ? documentRel(kind, { work: SAMPLE.work }) : documentRel(kind, { subject: SAMPLE.subject, sequence: SAMPLE.sequence });
}

function registryProblems(text) {
  const rows = registryRows(text);
  const missing = DOCUMENT_KINDS.filter((kind) => rows.filter(([rowKind]) => rowKind === kind).length !== 1).map((kind) => `${kind} needs exactly one registry row`);
  const differing = rows
    .filter((cells) => sampled(livesAt(cells)) !== expectedPath(cells[0]))
    .map((cells) => `${cells[0]} lives at ${livesAt(cells)}, picket name prints ${expectedPath(cells[0])}`);
  return [...missing, ...differing];
}

test("every registry row's Lives at path is the one picket name prints", () => {
  assert.deepEqual(registryProblems(readFileSync(REGISTRY, "utf8")), []);
});

test("a registry with one altered Lives at cell is reported for that kind", () => {
  const altered = readFileSync(REGISTRY, "utf8").replace("`artifacts/strategy/charters/<slug>.md`", "`artifacts/strategy/<slug>-charter.md`");
  assert.deepEqual(registryProblems(altered), ["charter lives at artifacts/strategy/<slug>-charter.md, picket name prints artifacts/strategy/charters/pricing-rules.md"]);
});
