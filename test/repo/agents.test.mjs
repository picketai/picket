import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bodyOf, fences, frontmatterFields, sections } from "#test/instructions.mts";
import { BLOCK_FIELDS, detectBlock } from "../../src/lib/shared/work/block.mts";
import { VERDICTS } from "../../src/lib/shared/verdicts.mjs";

const AGENTS_DIR = "src/agents";
const REQUIRED = ["name", "description", "tools", "model", "effort", "memory", "color"];
const ALLOWED = [...REQUIRED, "skills", "disallowedTools", "maxTurns", "autoCompactWindow", "background", "omitClaudeMd", "isolation", "experimental"];
const IGNORED_FOR_PLUGINS = ["hooks", "mcpServers", "permissionMode", "initialPrompt"];
const PARTS = ["Entry", "Constraints", "Work", "Memory", "Output"];
const VALUES = { model: /^(sonnet|opus|haiku|fable|inherit|claude-[a-z0-9-]+)$/, effort: /^(low|medium|high|xhigh|max)$/, memory: /^(user|project|local)$/, color: /^(red|blue|green|yellow|purple|orange|pink|cyan)$/ };
const PENDING = ["src/agents/analyst.md", "src/agents/architect.md", "src/agents/developer.md", "src/agents/reviewer.md"];
const KNOWN_TOOLS = ["Agent", "AskUserQuestion", "Bash", "Edit", "Glob", "Grep", "NotebookEdit", "PowerShell", "Read", "SendMessage", "Skill", "TodoWrite", "WebFetch", "WebSearch", "Write"];
const MCP_TOOL = /^mcp__[\w-]+__[\w-]+$/;
const WORK_PART = "Work";
const SAMPLE_ID = "20261029-sample";
const PLACEHOLDERS = [
  [/<id>/g, SAMPLE_ID],
  [/<n>/g, "1"],
  [/<\s*([^<>|]+?)\s*\|[^<>]*>/g, "$1"],
];

const SAMPLE_FRONTMATTER = {
  name: "sample",
  description: ">\n  Does one thing.",
  tools: "Read, Bash, mcp__atlassian__getJiraIssue",
  model: "sonnet",
  effort: "medium",
  memory: "project",
  color: "red",
};

function sampleAgent(overrides = {}, body = "") {
  const fields = { ...SAMPLE_FRONTMATTER, ...overrides };
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

function agentFiles() {
  return readdirSync(AGENTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({ path: `${AGENTS_DIR}/${name}`, text: readFileSync(join(AGENTS_DIR, name), "utf8") }));
}

function keyProblems(fields) {
  return Object.keys(fields).flatMap((key) => {
    if (ALLOWED.includes(key)) return [];
    if (IGNORED_FOR_PLUGINS.includes(key)) return [`"${key}" is ignored for plugin agents`];
    return [`"${key}" is not a known agent frontmatter key`];
  });
}

function toolNames(tools) {
  const list = Array.isArray(tools) ? tools : String(tools ?? "").split(",");
  return list.map((tool) => tool.trim()).filter(Boolean);
}

function valueProblems(fields) {
  const missing = REQUIRED.filter((key) => !(key in fields)).map((key) => `"${key}" is missing`);
  const invalid = Object.entries(VALUES)
    .filter(([key, pattern]) => key in fields && !pattern.test(String(fields[key])))
    .map(([key]) => `"${key}: ${fields[key]}" is not an accepted value`);
  const tools = toolNames(fields.tools)
    .filter((tool) => !KNOWN_TOOLS.includes(tool) && !MCP_TOOL.test(tool))
    .map((tool) => `tool "${tool}" is neither a known tool nor mcp__<server>__<tool>`);
  return [...missing, ...invalid, ...tools];
}

function identityProblems(lines, firstHeading) {
  const intro = lines.slice(0, firstHeading).join("\n").trim();
  if (!intro) return ["the body does not open with an identity paragraph"];
  return /\n\s*\n/.test(intro) ? ["the identity paragraph is more than one paragraph"] : [];
}

function partProblems(parts) {
  const extra = parts.filter((title) => !PARTS.includes(title)).map((title) => `"## ${title}" is not one of ${PARTS.join(", ")}`);
  const known = parts.filter((title) => PARTS.includes(title));
  const order = known.join(",") === PARTS.join(",") ? [] : [`the parts are ${known.join(", ") || "none"}; expected ${PARTS.join(", ")}`];
  return [...extra, ...order];
}

function subsectionProblems(all) {
  return all.flatMap((section) => {
    if (section.level !== 3) return [];
    const parent = all.filter((other) => other.level === 2 && other.line < section.line).at(-1);
    return parent?.title === WORK_PART ? [] : [`"### ${section.title}" sits under "## ${parent?.title ?? "nothing"}"; only "## ${WORK_PART}" holds ###`];
  });
}

function structureProblems(body) {
  const lines = body.split("\n");
  const all = sections(body);
  const parts = all.filter((section) => section.level === 2).map((section) => section.title);
  return [...identityProblems(lines, all[0]?.line ?? lines.length), ...partProblems(parts), ...subsectionProblems(all)];
}

function filledHeading(line) {
  return PLACEHOLDERS.reduce((text, [pattern, value]) => text.replace(pattern, value), line);
}

function outputFence(body) {
  const output = sections(body).find((section) => section.level === 2 && section.title === "Output");
  if (!output) return null;
  return fences(body.split("\n")).find((fence) => fence.start > output.line && fence.start < output.end) ?? null;
}

function contractProblems(fence, agent) {
  const kind = detectBlock(filledHeading(fence.lines[0] ?? ""));
  if (kind === null) return { kind, problems: [`the Output fence heading "${fence.lines[0]}" matches no BLOCK_HEADINGS entry`] };
  const last = fence.lines.filter((line) => line.trim()).at(-1)?.trim() ?? "";
  const verdict = VERDICTS[last]?.agent === agent ? [] : [`the Output fence ends with "${last}", not a verdict of ${agent}`];
  const labels = BLOCK_FIELDS[kind].filter((label) => !fence.lines.some((line) => line.startsWith(`${label}:`))).map((label) => `the ${kind} block has no "${label}:" line`);
  return { kind, problems: [...verdict, ...labels] };
}

function outputProblems(body, agent) {
  const fence = outputFence(body);
  return fence ? contractProblems(fence, agent) : { kind: null, problems: ["no fenced block under ## Output"] };
}

function structureFailures(files) {
  return files.filter(({ text }) => structureProblems(bodyOf(text)).length > 0).map(({ path }) => path).sort();
}

function assertPending(failing, pending) {
  const fixed = pending.filter((path) => !failing.includes(path));
  const fresh = failing.filter((path) => !pending.includes(path));
  assert.deepEqual(failing, [...pending].sort(), `PENDING must list exactly the failing shells; fixed but listed: ${fixed.join(", ") || "none"}; failing but unlisted: ${fresh.join(", ") || "none"}`);
}

const IDENTITY = "You are a sample agent.\n";
const PARTS_BODY = PARTS.map((part) => `\n## ${part}\n\nText.\n`).join("");

test("every agent frontmatter key is allowed", () => {
  for (const { path, text } of agentFiles()) assert.deepEqual(keyProblems(frontmatterFields(text)), [], path);
});

test("a plugin-ignored key, an unknown key and an allowed key are told apart", () => {
  assert.deepEqual(keyProblems(frontmatterFields(sampleAgent({ hooks: "x" }))), ['"hooks" is ignored for plugin agents']);
  assert.deepEqual(keyProblems(frontmatterFields(sampleAgent({ foo: "x" }))), ['"foo" is not a known agent frontmatter key']);
  assert.deepEqual(keyProblems(frontmatterFields(sampleAgent({ maxTurns: "5" }))), []);
});

test("every agent carries the required keys with accepted values and known tools", () => {
  for (const { path, text } of agentFiles()) assert.deepEqual(valueProblems(frontmatterFields(text)), [], path);
});

test("a bad effort, an unknown tool and a missing key fail; an MCP tool passes", () => {
  assert.deepEqual(valueProblems(frontmatterFields(sampleAgent())), []);
  assert.deepEqual(valueProblems(frontmatterFields(sampleAgent({ effort: "extreme" }))), ['"effort: extreme" is not an accepted value']);
  assert.deepEqual(valueProblems(frontmatterFields(sampleAgent({ tools: "Read, Frobnicate" }))), ['tool "Frobnicate" is neither a known tool nor mcp__<server>__<tool>']);
  const withoutColor = Object.fromEntries(Object.entries(SAMPLE_FRONTMATTER).filter(([key]) => key !== "color"));
  assert.deepEqual(valueProblems(withoutColor), ['"color" is missing']);
});

test("frontmatterFields folds a > scalar and reads a - list", () => {
  const fields = frontmatterFields("---\nname: a\ndescription: >\n  One\n  two.\nskills:\n  - picket:documenting\n  - picket:reviewing\n---\nBody");
  assert.deepEqual(fields, { name: "a", description: "One two.", skills: ["picket:documenting", "picket:reviewing"] });
});

test("every agent not in PENDING is an identity paragraph and the five parts", () => {
  for (const { path, text } of agentFiles().filter(({ path }) => !PENDING.includes(path))) assert.deepEqual(structureProblems(bodyOf(text)), [], path);
});

test("the identity paragraph and the five parts in order pass", () => {
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY), []);
});

test("an extra part, a ### outside Work and a missing part each fail", () => {
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY.replace("## Work", "## Two passes")), [
    '"## Two passes" is not one of Entry, Constraints, Work, Memory, Output',
    "the parts are Entry, Constraints, Memory, Output; expected Entry, Constraints, Work, Memory, Output",
  ]);
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY.replace("## Entry\n\nText.", "## Entry\n\n### Detail\n\nText.")), ['"### Detail" sits under "## Entry"; only "## Work" holds ###']);
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY.replace("\n## Memory\n\nText.\n", "")), [
    "the parts are Entry, Constraints, Work, Output; expected Entry, Constraints, Work, Memory, Output",
  ]);
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY.replace("## Work\n\nText.", "## Work\n\n### Order\n\nText.")), []);
});

test("a heading inside a fence is not a part", () => {
  assert.deepEqual(structureProblems(IDENTITY + PARTS_BODY.replace("## Output\n\nText.", "## Output\n\n```\n## X\n```")), []);
});

test("each shell's Output fence opens with a block heading, ends with its verdict and carries the kernel's labels", () => {
  const kinds = agentFiles().map(({ path, text }) => {
    const { kind, problems } = outputProblems(bodyOf(text), frontmatterFields(text).name);
    assert.deepEqual(problems, [], path);
    return kind;
  });
  assert.deepEqual(kinds.sort(), ["artifact", "phase", "report", "review"]);
});

test("a review fence without Classes: fails, and a fence ending on another agent's verdict fails", () => {
  const fence = (last, ...fields) => `${IDENTITY}\n## Output\n\n\`\`\`\n## Review: <id> · <crosscheck | pr>\n\nOne line.\n\n${fields.join("\n")}\n\n${last}\n\`\`\`\n`;
  assert.deepEqual(outputProblems(fence("APPROVED", "Classes: none"), "reviewer").problems, []);
  assert.deepEqual(outputProblems(fence("APPROVED"), "reviewer").problems, ['the review block has no "Classes:" line']);
  assert.deepEqual(outputProblems(fence("PHASE DONE", "Classes: none"), "reviewer").problems, ['the Output fence ends with "PHASE DONE", not a verdict of reviewer']);
});

test("PENDING lists exactly the shells that fail the structure check", () => {
  assertPending(structureFailures(agentFiles()), PENDING);
});

test("a fixed shell still in PENDING fails the PENDING check and is named", () => {
  const fixed = { path: "src/agents/fixed.md", text: sampleAgent({}, IDENTITY + PARTS_BODY) };
  assert.throws(() => assertPending(structureFailures([fixed]), ["src/agents/fixed.md"]), /fixed but listed: src\/agents\/fixed\.md/);
});
