import { createHash } from "node:crypto";
import { frontmatter, readValue, stringify, type YamlMap, type YamlValue } from "../../util/yaml-lite.mts";

export const STEP_WORDS = ["request", "expect", "capture", "wait"] as const;
export const HEADER_KEYS = ["id", "kind", "covers", "intent", "flow", "supersedes", "superseded_by", "status", "format", "fingerprint"] as const;
export const KINDS = ["normal", "boundary", "negative", "permission", "state", "integration", "smoke"] as const;
export const STATUSES = ["active", "deprecated"] as const;
export const FORMAT = 1;
export const MAX_WAIT_SECONDS = 20;

export type StepWord = (typeof STEP_WORDS)[number];
export type Kind = (typeof KINDS)[number];
export type ScenarioStatus = (typeof STATUSES)[number];

export type ScenarioHeader = {
  id: string;
  kind: Kind;
  covers: string[];
  intent: string;
  flow?: string;
  supersedes?: string;
  superseded_by?: string;
  status: ScenarioStatus;
  format: typeof FORMAT;
};

export type RequestStep = { word: "request"; line: number; method: string; target: string; headers: [string, string][]; body: string | null };
export type ExpectStep = { word: "expect"; line: number; what: "status"; status: number } | { word: "expect"; line: number; what: "contains"; text: string };
export type CaptureStep = { word: "capture"; line: number; name: string; from: "json" | "header"; key: string };
export type WaitStep = { word: "wait"; line: number; seconds: number };
export type Step = RequestStep | ExpectStep | CaptureStep | WaitStep;
export type Card = { header: ScenarioHeader; steps: Step[] };

const REQUIRED_KEYS = ["id", "kind", "covers", "intent", "format"];
const SCENARIO_ID = /^S-\d{4,}$/;
const COVER = /^[^\s/]+\/T-\d+\.\d+$/;
const FRONTMATTER_START = /^---\r?\n/;
const FINGERPRINT_KEY = "fingerprint:";
const FENCE = "---";
const INDENTED = /^\s/;

const REQUEST_WORD = /^request(?:\s|$)/;
const REQUEST = /^([A-Z]+)\s+(\S+)$/;
const HEADER_LINE = /^header\s+([A-Za-z0-9!#$%&'*+.^_`|~-]+):\s*(\S.*)$/;
const BODY_LINE = /^body\s+(\S.*)$/;
const EXPECT_STATUS = /^status\s+(\d{3})$/;
const EXPECT_CONTAINS = /^contains\s+(.+)$/;
const CAPTURE = /^([a-z][a-z0-9_]*)\s+(json|header)\s+(\S+)$/;
const WAIT = /^(\d+)s$/;

type FieldRule = { key: string; valid: (value: YamlValue) => boolean; message: string };

const isText = (value: YamlValue): boolean => typeof value === "string" && value.trim() !== "";
const isScenarioId = (value: YamlValue): boolean => typeof value === "string" && SCENARIO_ID.test(value);
const isOneOf = (list: readonly string[]) => (value: YamlValue): boolean => typeof value === "string" && list.includes(value);

const FIELD_RULES: FieldRule[] = [
  { key: "id", valid: isScenarioId, message: "id must be a scenario id such as S-0001" },
  { key: "kind", valid: isOneOf(KINDS), message: `kind must be one of ${KINDS.join(", ")}` },
  { key: "covers", valid: (v) => Array.isArray(v) && v.every((c) => typeof c === "string" && COVER.test(c)), message: "covers must be a list of <item id>/T-N.x" },
  { key: "intent", valid: isText, message: "intent must be text" },
  { key: "flow", valid: isText, message: "flow must be text" },
  { key: "supersedes", valid: isScenarioId, message: "supersedes must be a scenario id such as S-0001" },
  { key: "superseded_by", valid: isScenarioId, message: "superseded_by must be a scenario id such as S-0001" },
  { key: "status", valid: isOneOf(STATUSES), message: "status must be active or deprecated" },
  { key: "format", valid: (v) => v === FORMAT, message: `format must be ${FORMAT}` },
];

function headerProblems(front: YamlMap): string[] {
  const keys = Object.keys(front);
  const unknown = keys.filter((key) => !(HEADER_KEYS as readonly string[]).includes(key)).map((key) => `header: unknown key "${key}"`);
  const missing = REQUIRED_KEYS.filter((key) => !keys.includes(key)).map((key) => `header: missing key "${key}"`);
  const invalid = FIELD_RULES.filter(({ key, valid }) => keys.includes(key) && !valid(front[key])).map(({ message }) => `header: ${message}`);
  return [...unknown, ...missing, ...invalid];
}

function optionalText(front: YamlMap, key: "flow" | "supersedes" | "superseded_by"): Partial<ScenarioHeader> {
  return typeof front[key] === "string" ? { [key]: front[key] } : {};
}

function toHeader(front: YamlMap): ScenarioHeader {
  return {
    id: front.id as string,
    kind: front.kind as Kind,
    covers: front.covers as string[],
    intent: front.intent as string,
    ...optionalText(front, "flow"),
    ...optionalText(front, "supersedes"),
    ...optionalText(front, "superseded_by"),
    status: (front.status as ScenarioStatus | undefined) ?? "active",
    format: FORMAT,
  };
}

type StepRead = { step: Step } | { problem: string };

function stepProblem(line: number, text: string): StepRead {
  return { problem: `step ${line}: ${text}` };
}

function readRequest(rest: string, line: number): StepRead {
  const match = rest.match(REQUEST);
  if (!match) return stepProblem(line, "request takes a method and a target, such as request GET {orders}/health");
  return { step: { word: "request", line, method: match[1], target: match[2], headers: [], body: null } };
}

function jsonString(raw: string): string | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function readContains(raw: string, line: number): StepRead {
  const text = jsonString(raw);
  if (text === null) return stepProblem(line, `contains takes a JSON string, such as "ok"`);
  return { step: { word: "expect", line, what: "contains", text } };
}

function readExpect(rest: string, line: number): StepRead {
  const status = rest.match(EXPECT_STATUS);
  if (status) {
    const code = Number(status[1]);
    return code >= 100 && code <= 599 ? { step: { word: "expect", line, what: "status", status: code } } : stepProblem(line, "expect status takes a code from 100 to 599");
  }
  const contains = rest.match(EXPECT_CONTAINS);
  if (contains) return readContains(contains[1], line);
  return stepProblem(line, "expect is status <code> or contains <JSON string>");
}

function readCapture(rest: string, line: number): StepRead {
  const match = rest.match(CAPTURE);
  if (!match) return stepProblem(line, "capture is <name> json <dotted.path> or <name> header <Name>");
  return { step: { word: "capture", line, name: match[1], from: match[2] as "json" | "header", key: match[3] } };
}

function readWait(rest: string, line: number): StepRead {
  const seconds = Number(rest.match(WAIT)?.[1] ?? Number.NaN);
  if (seconds >= 1 && seconds <= MAX_WAIT_SECONDS) return { step: { word: "wait", line, seconds } };
  return stepProblem(line, `wait takes 1s to ${MAX_WAIT_SECONDS}s`);
}

function readStep(text: string, line: number, requested: boolean): StepRead {
  const word = text.split(/\s+/, 1)[0];
  const rest = text.slice(word.length).trim();
  if ((word === "expect" || word === "capture") && !requested) return stepProblem(line, `${word} comes before any request`);
  if (word === "request") return readRequest(rest, line);
  if (word === "expect") return readExpect(rest, line);
  if (word === "capture") return readCapture(rest, line);
  if (word === "wait") return readWait(rest, line);
  return stepProblem(line, `unknown step word "${word}"`);
}

function attachLine(request: RequestStep, text: string): string | null {
  const header = text.match(HEADER_LINE);
  if (header) {
    request.headers.push([header[1], header[2].trimEnd()]);
    return null;
  }
  const body = text.match(BODY_LINE);
  if (!body) return "an indented line under a request is header <Name>: <value> or body <text>";
  if (request.body !== null) return "a request takes one body";
  request.body = body[1].trimEnd();
  return null;
}

type StepsRead = { steps: Step[]; problems: string[] };

function readSteps(body: string): StepsRead {
  const steps: Step[] = [];
  const problems: string[] = [];
  let line = 0;
  let last: Step | "broken" | null = null;
  let requested = false;
  for (const raw of body.split("\n")) {
    if (raw.trim() === "") continue;
    if (INDENTED.test(raw)) {
      if (last === "broken") continue;
      const problem = last?.word === "request" ? attachLine(last, raw.trim()) : "an indented line sits only under a request";
      if (problem !== null) problems.push(`step ${Math.max(line, 1)}: ${problem}`);
      continue;
    }
    line += 1;
    const read = readStep(raw.trim(), line, requested);
    requested ||= REQUEST_WORD.test(raw);
    if ("problem" in read) problems.push(read.problem);
    else steps.push(read.step);
    last = "step" in read ? read.step : "broken";
  }
  if (line === 0) problems.push("step 1: a card holds no steps; start with a request");
  return { steps, problems };
}

function readFront(text: string): { front: YamlMap; body: string } | { problem: string } {
  if (!FRONTMATTER_START.test(text)) return { problem: "header: a card starts with a --- header block" };
  try {
    return frontmatter(text);
  } catch (error) {
    return { problem: `header: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function parseScenario(text: string): { card: Card | null; problems: string[] } {
  const read = readFront(text);
  if ("problem" in read) return { card: null, problems: [read.problem] };
  const header = headerProblems(read.front);
  const { steps, problems } = readSteps(read.body);
  const all = [...header, ...problems];
  return { card: all.length === 0 ? { header: toHeader(read.front), steps } : null, problems: all };
}

function present(key: string, value: string | undefined): YamlMap {
  return value === undefined ? {} : { [key]: value };
}

function headerMap(header: ScenarioHeader): YamlMap {
  return {
    id: header.id,
    kind: header.kind,
    covers: header.covers,
    intent: header.intent,
    ...present("flow", header.flow),
    ...present("supersedes", header.supersedes),
    ...present("superseded_by", header.superseded_by),
    status: header.status,
    format: header.format,
  };
}

function stepLines(step: Step): string[] {
  if (step.word === "request") {
    const headers = step.headers.map(([name, value]) => `  header ${name}: ${value}`);
    return [`request ${step.method} ${step.target}`, ...headers, ...(step.body === null ? [] : [`  body ${step.body}`])];
  }
  if (step.word === "expect") return [step.what === "status" ? `expect status ${step.status}` : `expect contains ${JSON.stringify(step.text)}`];
  if (step.word === "capture") return [`capture ${step.name} ${step.from} ${step.key}`];
  return [`wait ${step.seconds}s`];
}

export function writeScenario(card: Card): string {
  const header = stringify(headerMap(card.header));
  const steps = card.steps.flatMap(stepLines).join("\n");
  const unsigned = `${FENCE}\n${header}\n${FENCE}\n${steps}\n`;
  return `${FENCE}\n${header}\n${FINGERPRINT_KEY} ${fingerprintOf(unsigned)}\n${FENCE}\n${steps}\n`;
}

function fingerprintLine(lines: string[]): number {
  if (lines[0] !== FENCE) return -1;
  const close = lines.indexOf(FENCE, 1);
  const end = close < 0 ? lines.length : close;
  return lines.slice(0, end).findIndex((line, at) => at > 0 && line.startsWith(FINGERPRINT_KEY));
}

function lf(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function fingerprintOf(text: string): string {
  const lines = lf(text).split("\n");
  const at = fingerprintLine(lines);
  const unsigned = at < 0 ? lines : [...lines.slice(0, at), ...lines.slice(at + 1)];
  return `sha256:${createHash("sha256").update(unsigned.join("\n")).digest("hex")}`;
}

function recordedFingerprint(text: string): string | null {
  const lines = lf(text).split("\n");
  const at = fingerprintLine(lines);
  if (at < 0) return null;
  try {
    const value = readValue(lines[at].slice(FINGERPRINT_KEY.length), at + 1);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function fingerprintMatches(text: string): boolean {
  return recordedFingerprint(text) === fingerprintOf(text);
}
