export type HttpCheck = { covers: string; method: string; path: string; status: number; contains: string[] };
export type RunCheck = { covers: string; command: string; exit_code: number; contains: string[] };
export type DeclaredCheck = HttpCheck | RunCheck;
export type ReadChecks = { checks: DeclaredCheck[]; problems: string[] };

type Fields = Record<string, unknown>;

const HTTP_KEYS = ["covers", "method", "path", "status", "contains"];
const RUN_KEYS = ["covers", "command", "exit_code", "contains"];
const COVERS = /^T-(\d+)\.\d+$/;
const METHOD = /^[A-Z]+$/;

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coversProblems(covers: unknown, phase: number, at: string): string[] {
  const match = typeof covers === "string" ? covers.match(COVERS) : null;
  if (match && Number(match[1]) === phase) return [];
  return [`${at} covers ${JSON.stringify(covers ?? null)}, not a T-${phase}.<x> criterion of this phase`];
}

function containsProblems(contains: unknown, at: string): string[] {
  if (contains === undefined) return [];
  const strings = Array.isArray(contains) && contains.every((item) => typeof item === "string" && item !== "");
  return strings ? [] : [`${at} contains must be a list of non-empty strings`];
}

function foreignKeyProblems(fields: Fields, keys: string[], kind: string, at: string): string[] {
  return Object.keys(fields)
    .filter((key) => !keys.includes(key))
    .map((key) => `${at} has key ${key}, which ${kind} check does not take`);
}

function httpProblems(fields: Fields, at: string): string[] {
  const problems: string[] = [];
  if (typeof fields.method !== "string" || !METHOD.test(fields.method)) problems.push(`${at} method must be upper-case letters, such as GET`);
  if (typeof fields.path !== "string" || !fields.path.startsWith("/")) problems.push(`${at} path must start with /`);
  const status = fields.status;
  if (typeof status !== "number" || !Number.isInteger(status) || status < 100 || status > 599) problems.push(`${at} status must be an integer from 100 to 599`);
  return problems;
}

function runProblems(fields: Fields, at: string): string[] {
  const problems: string[] = [];
  if (typeof fields.command !== "string" || fields.command.trim() === "") problems.push(`${at} command must not be empty`);
  if (typeof fields.exit_code !== "number" || !Number.isInteger(fields.exit_code)) problems.push(`${at} exit_code must be an integer`);
  return problems;
}

function kindProblems(fields: Fields, at: string): string[] {
  if (Object.hasOwn(fields, "path")) return [...foreignKeyProblems(fields, HTTP_KEYS, "an HTTP", at), ...httpProblems(fields, at)];
  return [...foreignKeyProblems(fields, RUN_KEYS, "a run", at), ...runProblems(fields, at)];
}

function checkProblems(entry: unknown, phase: number, at: string): string[] {
  const fields = isFields(entry) ? entry : {};
  const hasPath = Object.hasOwn(fields, "path");
  const hasCommand = Object.hasOwn(fields, "command");
  if (hasPath && hasCommand) return [`${at} has both path and command; a check is an HTTP check or a run check`];
  if (!hasPath && !hasCommand) return [`${at} has neither path nor command`];
  return [...coversProblems(fields.covers, phase, at), ...kindProblems(fields, at), ...containsProblems(fields.contains, at)];
}

function toCheck(fields: Fields): DeclaredCheck {
  const contains = Array.isArray(fields.contains) ? fields.contains.map(String) : [];
  const covers = String(fields.covers);
  if (Object.hasOwn(fields, "path")) return { covers, method: String(fields.method), path: String(fields.path), status: Number(fields.status), contains };
  return { covers, command: String(fields.command), exit_code: Number(fields.exit_code), contains };
}

export function readChecks(drive: unknown, phase: number): ReadChecks | null {
  if (!Array.isArray(drive)) return null;
  if (drive.length === 0) return { checks: [], problems: ["is an empty list; write drive: true, false, or at least one check"] };
  const checks: DeclaredCheck[] = [];
  const problems: string[] = [];
  drive.forEach((entry, i) => {
    const found = checkProblems(entry, phase, `check ${i + 1}`);
    if (found.length) problems.push(...found);
    else checks.push(toCheck(entry as Fields));
  });
  return { checks, problems };
}
