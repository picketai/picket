import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Change } from "../change.mts";
import type { Host } from "../host.mts";
import { backupsDir, stampOf, type ItemFields } from "../manifest.mts";

export type ExternalParts = { backup?: string; previous: Record<string, unknown>; data: Record<string, unknown> };

export function quote(text: string): string {
  return `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function quoteList(items: readonly string[]): string {
  return `[${items.map(quote).join(", ")}]`;
}

export function parseList(raw: string | null): string[] {
  return [...(raw ?? "").matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replace(/\\(.)/g, "$1"));
}

export function unquote(raw: string | null): string | null {
  return parseList(raw)[0] ?? null;
}

function dconf(host: Host, args: string[]): string {
  const run = host.exec("dconf", args);
  if (run.status !== 0) throw new Error(`dconf ${args.join(" ")} failed: ${run.stderr.trim()}`);
  return run.stdout;
}

export function hasDconf(host: Host): boolean {
  return host.exec("dconf", ["help"]).status === 0;
}

export function dconfRead(host: Host, key: string): string | null {
  const value = dconf(host, ["read", key]).trim();
  return value === "" ? null : value;
}

export function dconfWrite(host: Host, key: string, value: string): void {
  dconf(host, ["write", key, value]);
}

export function dconfResetDir(host: Host, path: string): void {
  dconf(host, ["reset", "-f", path]);
}

export function restoreKey(host: Host, key: string, raw: string | null): void {
  if (raw === null) dconf(host, ["reset", key]);
  else dconfWrite(host, key, raw);
}

export function saveDump(host: Host, id: string, path: string): string {
  const target = join(backupsDir(host.home), stampOf(host), `${id}.dconf`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, dconf(host, ["dump", path]));
  return target;
}

export function appendToList(host: Host, key: string, uuid: string, implicit: readonly string[]): string | null {
  const raw = dconfRead(host, key);
  const current = raw === null ? implicit : parseList(raw);
  dconfWrite(host, key, quoteList([...current, uuid]));
  return raw;
}

export function removeFromList(host: Host, key: string, uuid: string, previous: string | null, implicit: readonly string[]): void {
  const remaining = parseList(dconfRead(host, key)).filter((entry) => entry !== uuid);
  if (previous === null && remaining.join() === implicit.join()) dconf(host, ["reset", key]);
  else dconfWrite(host, key, quoteList(remaining));
}

export function dconfMissing(writer: string, terminal: string): Change[] {
  return [{ id: `${writer}-no-dconf`, summary: `dconf is not available, so ${terminal} cannot be set up`, manual: `install dconf (the dconf-cli package), then run picket style apply again` }];
}

export function externalFields({ backup, previous, data }: ExternalParts): ItemFields {
  return { kind: "external", ...(backup ? { backup } : {}), previous, data };
}
