import { PLACEHOLDER } from "./rules.mts";

export type ValueScope = { run: string; captures: Record<string, string>; env: NodeJS.ProcessEnv; today: string };
export type Resolved = { text: string } | { blocked: string };

const RUN_KEY = "run";
const RUN_KEY_BYTES = 2;
const USER_PREFIX = "user:";
const RELATIVE_DATE = /^date:([+-]\d+)d$/;
const UTC_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" });

export function userVariable(role: string, field: string): string {
  return `PICKET_USER_${`${role}_${field}`.toUpperCase().replace(/[-.]/g, "_")}`;
}

export function relativeDate(today: string, days: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const parts = Object.fromEntries(UTC_DAY.formatToParts(Date.UTC(year, month - 1, day + days)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function newRunKey(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, RUN_KEY_BYTES), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function testUser(name: string, env: NodeJS.ProcessEnv): Resolved {
  const reference = name.slice(USER_PREFIX.length);
  const dot = reference.indexOf(".");
  const role = reference.slice(0, dot);
  const variable = userVariable(role, reference.slice(dot + 1));
  const value = env[variable];
  return value === undefined || value === "" ? { blocked: `test user ${role} has no ${variable}` } : { text: value };
}

function resolveName(name: string, scope: ValueScope): Resolved {
  if (name === RUN_KEY) return { text: scope.run };
  const date = name.match(RELATIVE_DATE);
  if (date) return { text: relativeDate(scope.today, Number(date[1])) };
  if (name.startsWith(USER_PREFIX)) return testUser(name, scope.env);
  const captured = scope.captures[name];
  return captured === undefined ? { blocked: `{${name}} has no value` } : { text: captured };
}

export function resolveText(template: string, scope: ValueScope): Resolved {
  let text = "";
  let copied = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const value = resolveName(match[1], scope);
    if ("blocked" in value) return value;
    text += template.slice(copied, match.index) + value.text;
    copied = match.index + match[0].length;
  }
  return { text: text + template.slice(copied) };
}
