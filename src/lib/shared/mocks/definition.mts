import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, relative } from "node:path";
import { frontmatter, type YamlMap, type YamlValue } from "../../util/yaml-lite.mts";
import type { EnvModel } from "../env/model.mts";
import type { Finding } from "../env/rules.mts";
import { MOCK_DIR } from "../env/standard.mts";

export const MOCK_FORMAT = 1;
export const MOCK_HEADER_KEYS = ["replaces", "source", "recorded", "api", "format"] as const;
export const SOURCES = ["recorded", "api"] as const;
export const RESERVED_PREFIX = "/__picket/";
export const MOCK_RULE = "E12";

export type MockSource = (typeof SOURCES)[number];
export type MockAnswer = { line: number; method: string; path: string; status: number; headers: [string, string][]; body: string | null };
export type MockDefinition = { service: string; replaces: string; source: MockSource; recorded: string | null; api: string | null; format: typeof MOCK_FORMAT; answers: MockAnswer[] };
export type MockRead = { definition: MockDefinition | null; problems: string[] };
export type MockFile = MockRead & { service: string; path: string };

type Draft = Omit<MockAnswer, "status"> & { status: number | null };

const REQUIRED_KEYS = ["replaces", "source", "format"];
const FRONTMATTER_START = /^---\r?\n/;
const INDENTED = /^\s/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WHEN = /^([A-Z]+)\s+(\S+)$/;
const STATUS_LINE = /^status\s+(\d{3})$/;
const HEADER_LINE = /^header\s+([A-Za-z0-9!#$%&'*+.^_`|~-]+):\s*(\S.*)$/;
const BODY_LINE = /^body\s+(\S.*)$/;
const DEFINITION_FILE = /\.md$/;
const WILDCARD = "*";

const isText = (value: YamlValue | undefined): value is string => typeof value === "string" && value.trim() !== "";

function readFront(text: string): { front: YamlMap; body: string } | { problem: string } {
  if (!FRONTMATTER_START.test(text)) return { problem: "header: a definition starts with a --- header block" };
  try {
    return frontmatter(text);
  } catch (error) {
    return { problem: `header: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function sourceProblems(front: YamlMap): string[] {
  if (front.source === "recorded") return isText(front.recorded) && DATE.test(front.recorded) ? [] : ["header: source recorded needs recorded: YYYY-MM-DD, the day the answers were recorded"];
  if (front.source === "api") return isText(front.api) ? [] : ["header: source api needs api: <path>, the API description the answers were written from"];
  return [`header: source must be one of ${SOURCES.join(", ")}`];
}

function headerProblems(front: YamlMap): string[] {
  const keys = Object.keys(front);
  const unknown = keys.filter((key) => !(MOCK_HEADER_KEYS as readonly string[]).includes(key)).map((key) => `header: unknown key "${key}"`);
  const missing = REQUIRED_KEYS.filter((key) => !keys.includes(key)).map((key) => `header: missing key "${key}"`);
  const replaces = keys.includes("replaces") && !isText(front.replaces) ? ["header: replaces must name the real service"] : [];
  const format = keys.includes("format") && front.format !== MOCK_FORMAT ? [`header: format must be ${MOCK_FORMAT}; record the definition again in format ${MOCK_FORMAT}`] : [];
  const source = keys.includes("source") ? sourceProblems(front) : [];
  return [...unknown, ...missing, ...replaces, ...format, ...source];
}

function pathProblem(path: string): string | null {
  if (!path.startsWith("/")) return "a path starts with /";
  if (path.includes("?") || path.includes("#")) return "a path holds no ? or #: the query string is never matched";
  if (path.startsWith(RESERVED_PREFIX)) return `paths under ${RESERVED_PREFIX} belong to Picket's stub`;
  const partial = path.split("/").some((segment) => segment.includes(WILDCARD) && segment !== WILDCARD);
  return partial ? "* matches one whole segment, such as /orders/*" : null;
}

function readWhen(rest: string): Draft | string {
  const match = rest.match(WHEN);
  if (!match) return "when takes a method and a path, such as when GET /orders/*";
  return pathProblem(match[2]) ?? { line: 0, method: match[1], path: match[2], status: null, headers: [], body: null };
}

function attachLine(answer: Draft, text: string): string | null {
  const status = text.match(STATUS_LINE);
  if (status) {
    if (answer.status !== null) return "an answer takes one status";
    const code = Number(status[1]);
    if (code < 100 || code > 599) return "status takes a code from 100 to 599";
    answer.status = code;
    return null;
  }
  const header = text.match(HEADER_LINE);
  if (header) {
    answer.headers.push([header[1], header[2].trimEnd()]);
    return null;
  }
  const body = text.match(BODY_LINE);
  if (!body) return "an indented line under a when is status <code>, header <Name>: <value> or body <text>";
  if (answer.body !== null) return "an answer takes one body";
  answer.body = body[1].trimEnd();
  return null;
}

function readTopLine(text: string, line: number): Draft | string {
  const word = text.split(/\s+/, 1)[0];
  if (word !== "when") return `unknown word "${word}"`;
  const read = readWhen(text.slice(word.length).trim());
  return typeof read === "string" ? read : { ...read, line };
}

type AnswersRead = { drafts: Draft[]; problems: string[] };

function readAnswers(body: string): AnswersRead {
  const drafts: Draft[] = [];
  const problems: string[] = [];
  let line = 0;
  let last: Draft | "broken" | null = null;
  for (const raw of body.split("\n")) {
    if (raw.trim() === "") continue;
    if (INDENTED.test(raw)) {
      if (last === "broken") continue;
      const problem = last === null ? "an indented line sits only under a when" : attachLine(last, raw.trim());
      if (problem !== null) problems.push(`when ${Math.max(line, 1)}: ${problem}`);
      continue;
    }
    line += 1;
    const read = readTopLine(raw.trim(), line);
    if (typeof read === "string") problems.push(`when ${line}: ${read}`);
    else drafts.push(read);
    last = typeof read === "string" ? "broken" : read;
  }
  if (line === 0) problems.push("when 1: a definition holds no answers; start with when <METHOD> <path>");
  return { drafts, problems };
}

function answerProblems(drafts: Draft[]): string[] {
  const first = new Map<string, number>();
  return drafts.flatMap((draft) => {
    const missing = draft.status === null ? [`when ${draft.line}: an answer takes one status`] : [];
    const key = `${draft.method} ${draft.path}`;
    const earlier = first.get(key);
    if (earlier === undefined) first.set(key, draft.line);
    const repeated = earlier === undefined ? [] : [`when ${draft.line}: ${key} is already answered by when ${earlier}`];
    return [...missing, ...repeated];
  });
}

function toDefinition(front: YamlMap, service: string, drafts: Draft[]): MockDefinition {
  return {
    service,
    replaces: front.replaces as string,
    source: front.source as MockSource,
    recorded: isText(front.recorded) ? front.recorded : null,
    api: isText(front.api) ? front.api : null,
    format: MOCK_FORMAT,
    answers: drafts.map((draft) => ({ ...draft, status: draft.status as number })),
  };
}

export function parseMock(text: string, service: string): MockRead {
  const read = readFront(text);
  if ("problem" in read) return { definition: null, problems: [read.problem] };
  const { drafts, problems } = readAnswers(read.body);
  const all = [...headerProblems(read.front), ...problems, ...answerProblems(drafts)];
  return { definition: all.length === 0 ? toDefinition(read.front, service, drafts) : null, problems: all };
}

export function listMocks(root: string): MockFile[] {
  const dir = join(root, MOCK_DIR);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && DEFINITION_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  return names.map((name) => {
    const service = basename(name, ".md");
    const path = `${MOCK_DIR}/${name}`;
    return { service, path, ...parseMock(readFileSync(join(root, path), "utf8"), service) };
  });
}

function insideRoot(root: string, path: string): boolean {
  const rel = relative(root, join(root, path));
  return !isAbsolute(path) && rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function serviceProblems(mock: MockFile, model: EnvModel): string[] {
  const service = model.services.find((candidate) => candidate.name === mock.service);
  if (service === undefined) return [`${mock.path} defines ${mock.service}, which is no service of the environment`];
  if (service.role !== "mock") return [`${mock.path} defines ${mock.service}, whose role is ${service.role ?? "unset"}: a definition serves only a mock`];
  const owned = [...(service.ports.length > 0 ? ["ports"] : []), ...(service.volumes.length > 0 ? ["volumes"] : [])];
  return owned.length === 0 ? [] : [`${mock.service} declares ${owned.join(" and ")} in compose.yaml; the stub owns its port and files: remove them`];
}

function apiProblems(root: string, api: string | null): string[] {
  if (api === null) return [];
  if (!insideRoot(root, api)) return [`api ${api} must be a path inside the project`];
  return existsSync(join(root, api)) ? [] : [`api ${api} does not exist`];
}

export function mockFindings(root: string, model: EnvModel, mocks: MockFile[] = listMocks(root)): Finding[] {
  return mocks.flatMap((mock) => {
    const messages = [...mock.problems, ...serviceProblems(mock, model), ...apiProblems(root, mock.definition?.api ?? null)];
    return messages.map((message) => ({ rule: MOCK_RULE, service: mock.service, level: "error" as const, message }));
  });
}
