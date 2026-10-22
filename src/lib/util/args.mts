export class UsageError extends Error {}

export type OptValue = string | true;
export type Args = { pos: string[]; opt: Record<string, OptValue | OptValue[]>; stdin: () => string };

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const WHOLE_NUMBER = /^\d+$/;
const MS_PER_SECOND = 1000;

const noStdin = (): string => "";

export function parseArgs(argv: string[], stdin: () => string = noStdin): Args {
  const pos: string[] = [];
  const opt: Args["opt"] = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      const value: OptValue = next === undefined || next.startsWith("--") ? true : argv[++i];
      const seen = opt[key];
      opt[key] = seen === undefined ? value : [...(Array.isArray(seen) ? seen : [seen]), value];
    } else pos.push(token);
  }
  return { pos, opt, stdin };
}

function occurrences(args: Args, name: string): OptValue[] {
  const value = args.opt[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function str(args: Args, name: string): string | undefined {
  const values = occurrences(args, name);
  if (values.length === 0) return undefined;
  const [value] = values;
  if (values.length > 1 || value === true) throw new UsageError(`--${name} needs exactly one value`);
  return value;
}

export function need(args: Args, name: string): string {
  const value = str(args, name);
  if (value === undefined) throw new UsageError(`--${name} is required`);
  return value;
}

export function list(args: Args, name: string): string[] {
  const value = str(args, name);
  if (value === undefined) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function many(args: Args, name: string): string[] {
  return occurrences(args, name).map((value) => {
    if (value === true) throw new UsageError(`--${name} needs a value`);
    return value;
  });
}

export function int(args: Args, name: string): number | undefined {
  const value = str(args, name);
  if (value === undefined) return undefined;
  if (!WHOLE_NUMBER.test(value)) throw new UsageError(`--${name} needs a whole number, got "${value}"`);
  return Number(value);
}

export function seconds(args: Args, name: string): number | undefined {
  const value = int(args, name);
  return value === undefined ? undefined : value * MS_PER_SECOND;
}

export function flag(args: Args, name: string): boolean {
  const values = occurrences(args, name);
  const given = values.find((value) => value !== true);
  if (given !== undefined) throw new UsageError(`--${name} takes no value, got "${given}"`);
  return values.length > 0;
}

function pair(name: string, value: OptValue): [string, string] {
  const text = value === true ? "" : value;
  const eq = text.indexOf("=");
  const key = eq > 0 ? text.slice(0, eq) : "";
  if (!ENV_NAME.test(key)) throw new UsageError(`--${name} needs NAME=VALUE with NAME matching ${ENV_NAME.source}, got "${text}"`);
  return [key, text.slice(eq + 1)];
}

export function pairs(args: Args, name: string): Record<string, string> {
  return Object.fromEntries(occurrences(args, name).map((value) => pair(name, value)));
}
