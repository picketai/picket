import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { frontmatter, type YamlMap, type YamlValue } from "../../util/yaml-lite.mts";
import type { EnvModel } from "../env/model.mts";
import type { Finding } from "../env/rules.mts";
import { CATALOG_DIR, DATA_DIR, ENV_DIR } from "../env/standard.mts";
import type { SavedScenario } from "../scenarios/files.mts";
import { FORMAT, readSteps, type Card, type Step } from "../scenarios/format.mts";
import { scenarioProblems } from "../scenarios/rules.mts";
import { userVariable } from "../scenarios/values.mts";

export const ENTRY_KINDS = ["create", "find", "fixed", "user", "sql"] as const;
export const ENTRY_HEADER_KEYS = ["kind", "need", "how", "file", "service", "role", "fields", "format"] as const;
export const ENTRY_FORMAT = 1;

export type EntryKind = (typeof ENTRY_KINDS)[number];
export type CatalogEntry = {
  name: string;
  kind: EntryKind;
  need: string;
  how: string | null;
  file: string | null;
  service: string | null;
  role: string | null;
  fields: string[];
  steps: Step[];
  captures: string[];
};
export type EntryRead = { entry: CatalogEntry | null; problems: string[] };
export type EntryFile = EntryRead & { name: string; path: string };

const REQUIRED_KEYS = ["kind", "need", "format"];
const ENTRY_NAME = /^[a-z][a-z0-9-]*$/;
const FRONTMATTER_START = /^---\r?\n/;
const ENTRY_FILE = /\.md$/;
const READ_ONLY_KINDS: readonly EntryKind[] = ["find", "fixed", "sql"];
const READ_METHOD = "GET";
const CHANGING_METHODS = ["POST", "PUT", "PATCH"];
const OWN_DATA = "PKT-{run}";
const DATA_MARK = "{data:";
const DATA_REF = /\{data:([a-z][a-z0-9-]*)\.([a-z][a-z0-9_]*)\}/g;
const DATA_ROLE = "data";

const isText = (value: YamlValue | undefined): value is string => typeof value === "string" && value.trim() !== "";
const isTextList = (value: YamlValue | undefined): value is string[] => Array.isArray(value) && value.length > 0 && value.every((item) => isText(item));

function readFront(text: string): { front: YamlMap; body: string } | { problem: string } {
  if (!FRONTMATTER_START.test(text)) return { problem: "header: an entry starts with a --- header block" };
  try {
    return frontmatter(text);
  } catch (error) {
    return { problem: `header: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function isKind(value: YamlValue | undefined): value is EntryKind {
  return typeof value === "string" && (ENTRY_KINDS as readonly string[]).includes(value);
}

function kindKeyProblems(front: YamlMap): string[] {
  if (front.kind === "fixed" && !isText(front.how)) return ["header: a fixed entry says how the record was made in how"];
  if (front.kind === "sql") return [...(isText(front.file) ? [] : ["header: a sql entry names its file under data/ in file"]), ...(isText(front.service) ? [] : ["header: a sql entry names the data service that runs its file in service"])];
  if (front.kind === "user") return [...(isText(front.role) ? [] : ["header: a user entry names its role"]), ...(isTextList(front.fields) ? [] : ["header: a user entry lists its fields, such as [name, password]"])];
  return [];
}

function headerProblems(front: YamlMap): string[] {
  const keys = Object.keys(front);
  const unknown = keys.filter((key) => !(ENTRY_HEADER_KEYS as readonly string[]).includes(key)).map((key) => `header: unknown key "${key}"`);
  const missing = REQUIRED_KEYS.filter((key) => !keys.includes(key)).map((key) => `header: missing key "${key}"`);
  const kind = keys.includes("kind") && !isKind(front.kind) ? [`header: kind must be one of ${ENTRY_KINDS.join(", ")}`] : [];
  const need = keys.includes("need") && !isText(front.need) ? ["header: need must say what data the entry gives"] : [];
  const format = keys.includes("format") && front.format !== ENTRY_FORMAT ? [`header: format must be ${ENTRY_FORMAT}; write the entry again in format ${ENTRY_FORMAT}`] : [];
  return [...unknown, ...missing, ...kind, ...need, ...format, ...kindKeyProblems(front)];
}

function requests(steps: Step[]) {
  return steps.flatMap((step) => (step.word === "request" ? [step] : []));
}

function stepTexts(step: Step): string[] {
  if (step.word === "request") return [step.target, ...step.headers.map(([, value]) => value), ...(step.body === null ? [] : [step.body])];
  if (step.word === "expect" && step.what === "contains") return [step.text];
  return [];
}

function kindStepProblems(kind: EntryKind, steps: Step[]): string[] {
  const sent = requests(steps);
  if (READ_ONLY_KINDS.includes(kind)) {
    return sent.filter((step) => step.method !== READ_METHOD).map((step) => `step ${step.line}: a ${kind} entry sends only GET requests, not ${step.method}`);
  }
  const ownsData = sent.some((step) => CHANGING_METHODS.includes(step.method) && (step.target.includes(OWN_DATA) || (step.body ?? "").includes(OWN_DATA)));
  return kind === "create" && !ownsData ? [`a create entry sends a POST, PUT or PATCH whose target or body holds ${OWN_DATA}`] : [];
}

function stepRuleProblems(kind: EntryKind, steps: Step[]): string[] {
  const captures = steps.some((step) => step.word === "capture") ? [] : ["an entry captures at least one value"];
  const data = steps.filter((step) => stepTexts(step).some((text) => text.includes(DATA_MARK))).map((step) => `step ${step.line}: an entry takes no {data:...} value`);
  return [...kindStepProblems(kind, steps), ...captures, ...data];
}

function hasStepLines(body: string): boolean {
  return body.split("\n").some((line) => line.trim() !== "");
}

function bodyRead(kind: EntryKind | null, body: string): { steps: Step[]; problems: string[] } {
  if (kind === "user") return { steps: [], problems: hasStepLines(body) ? ["a user entry has no steps: its values come from the PICKET_USER_ variables"] : [] };
  const { steps, problems } = readSteps(body);
  return { steps, problems: kind === null || problems.length > 0 ? problems : stepRuleProblems(kind, steps) };
}

function toEntry(front: YamlMap, name: string, steps: Step[]): CatalogEntry {
  return {
    name,
    kind: front.kind as EntryKind,
    need: front.need as string,
    how: isText(front.how) ? front.how : null,
    file: isText(front.file) ? front.file : null,
    service: isText(front.service) ? front.service : null,
    role: isText(front.role) ? front.role : null,
    fields: isTextList(front.fields) ? front.fields : [],
    steps,
    captures: steps.flatMap((step) => (step.word === "capture" ? [step.name] : [])),
  };
}

export function parseEntry(text: string, name: string): EntryRead {
  const read = readFront(text);
  const nameProblems = ENTRY_NAME.test(name) ? [] : [`name: ${name} must be lowercase letters, digits and -, starting with a letter`];
  if ("problem" in read) return { entry: null, problems: [...nameProblems, read.problem] };
  const { steps, problems } = bodyRead(isKind(read.front.kind) ? read.front.kind : null, read.body);
  const all = [...nameProblems, ...headerProblems(read.front), ...problems];
  return { entry: all.length === 0 ? toEntry(read.front, name, steps) : null, problems: all };
}

export function listEntries(root: string): EntryFile[] {
  const dir = join(root, CATALOG_DIR);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((file) => file.isFile() && ENTRY_FILE.test(file.name))
    .map((file) => file.name)
    .sort();
  return names.map((file) => {
    const name = basename(file, ".md");
    const path = `${CATALOG_DIR}/${file}`;
    return { name, path, ...parseEntry(readFileSync(join(root, path), "utf8"), name) };
  });
}

export function asCard(steps: Step[]): Card {
  return { header: { id: "", kind: "normal", covers: [], intent: "", status: "active", format: FORMAT }, steps };
}

function sqlFileProblems(root: string, file: string): string[] {
  const data = resolve(root, DATA_DIR);
  const target = resolve(root, ENV_DIR, file);
  const rel = relative(data, target);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return [`file ${file} must be a file under ${DATA_DIR}/, written as data/<name>.sql`];
  return existsSync(target) ? [] : [`file ${file} does not exist under ${ENV_DIR}/`];
}

function sqlServiceProblems(model: EnvModel, name: string): string[] {
  const service = model.services.find((candidate) => candidate.name === name);
  if (service === undefined) return [`service ${name} is no service of the environment`];
  return service.role === DATA_ROLE ? [] : [`service ${name} has role ${service.role ?? "unset"}; a sql entry runs through a data service`];
}

function entryProblems(root: string, model: EnvModel, entry: CatalogEntry): string[] {
  const services = model.services.map((service) => service.name);
  const sql = entry.kind === "sql" ? [...sqlFileProblems(root, entry.file ?? ""), ...sqlServiceProblems(model, entry.service ?? "")] : [];
  return [...sql, ...scenarioProblems(asCard(entry.steps), services)];
}

function userFindings(entry: CatalogEntry, env: NodeJS.ProcessEnv, rule: string): Finding[] {
  if (entry.kind !== "user" || entry.role === null) return [];
  const role = entry.role;
  return entry.fields
    .map((field) => userVariable(role, field))
    .filter((variable) => (env[variable] ?? "") === "")
    .map((variable) => ({ rule, service: entry.name, level: "pending", message: `${variable} is unset; set it in the shell that starts Claude Code` }));
}

function scenarioDataProblems(scenario: SavedScenario, entries: readonly EntryFile[]): string[] {
  const texts = scenario.card?.steps.flatMap(stepTexts) ?? [];
  const refs = [...new Set(texts.flatMap((text) => [...text.matchAll(DATA_REF)].map((match) => `${match[1]}.${match[2]}`)))];
  return refs.flatMap((ref) => {
    const [name, capture] = ref.split(".");
    const found = entries.find((file) => file.name === name);
    if (found === undefined) return [`{data:${ref}} names no catalog entry ${name}`];
    const captures = found.entry?.captures ?? [];
    return captures.includes(capture) ? [] : [`{data:${ref}}: ${name} captures ${captures.length ? `only ${captures.join(", ")}` : "nothing"}`];
  });
}

export function entryFindings(root: string, model: EnvModel, scenarios: readonly SavedScenario[], env: NodeJS.ProcessEnv, rule: string): Finding[] {
  const error = (subject: string, message: string): Finding => ({ rule, service: subject, level: "error", message });
  const entries = listEntries(root);
  const ofEntries = entries.flatMap((file) => {
    const problems = [...file.problems, ...(file.entry ? entryProblems(root, model, file.entry) : [])];
    return [...problems.map((message) => error(file.name, message)), ...(file.entry ? userFindings(file.entry, env, rule) : [])];
  });
  const ofScenarios = scenarios.flatMap((scenario) => scenarioDataProblems(scenario, entries).map((message) => error(scenario.id ?? scenario.path, message)));
  return [...ofEntries, ...ofScenarios];
}
