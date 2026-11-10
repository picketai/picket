import { readFileSync } from "node:fs";
import { pluginManifestPath } from "./paths.mts";

type SemVer = { core: number[]; prerelease: string[] };

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const NUMERIC = /^\d+$/;

export function picketVersion(): string {
  return JSON.parse(readFileSync(pluginManifestPath(), "utf8")).version;
}

function parseSemVer(text: string): SemVer | null {
  const match = SEMVER.exec(text);
  if (match === null) return null;
  return { core: [match[1], match[2], match[3]].map(Number), prerelease: match[4] ? match[4].split(".") : [] };
}

function compareIdentifiers(a: string, b: string): number {
  const aNumeric = NUMERIC.test(a);
  const bNumeric = NUMERIC.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return b.length - a.length;
  for (let at = 0; at < Math.min(a.length, b.length); at++) {
    const order = compareIdentifiers(a[at], b[at]);
    if (order !== 0) return order;
  }
  return a.length - b.length;
}

function compareSemVer(a: SemVer, b: SemVer): number {
  const coreOrder = a.core.map((part, at) => part - b.core[at]).find((difference) => difference !== 0);
  return coreOrder ?? comparePrerelease(a.prerelease, b.prerelease);
}

export function isNewerVersion(candidate: string, recorded: string): boolean {
  const next = parseSemVer(candidate);
  if (next === null) return false;
  const previous = parseSemVer(recorded);
  return previous === null || compareSemVer(next, previous) > 0;
}
