import { basename } from "node:path";
import { SOURCE_NAME_CHARS } from "./source.mts";

export const TOKEN_CAP = 200;

export type Reference = { ref: string; source: string | null; path: string; anchor: string | null; pin: string | null };

export type ExtractedReferences = { refs: Reference[]; unshaped: string[] };

type Classified = Reference | { unshaped: string } | null;

const SEGMENT = "[A-Za-z0-9_.-]+";
const PATH_LIKE = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+$`);
const NAME_WITH_EXT = /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]+$/;
const PIN = new RegExp(`^(${SOURCE_NAME_CHARS})@([A-Za-z0-9_./-]+):(.+)$`);
const MARKDOWN_LINK = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function hasExtension(path: string): boolean {
  return /\.[A-Za-z0-9]+$/.test(basename(path));
}

function isSafe(path: string): boolean {
  return !path.split("/").some((s) => s === "." || s === "..");
}

function decodePercent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function cleanToken(raw: string): { word: string; anchor: string | null } {
  let word = raw.trim().replace(/^[("'[{<*]+/, "").replace(/[)"'\]}>.,;!?*]+$/, "");
  let anchor: string | null = null;
  const hash = word.indexOf("#");
  if (hash >= 0) {
    anchor = word.slice(hash + 1) || null;
    word = word.slice(0, hash);
  }
  word = word.replace(/\?.*$/, "").replace(/:\d+(-\d+)?$/, "").replace(/[.,;:!?]+$/, "");
  return { word, anchor };
}

function classify(word: string, anchor: string | null, backticked: boolean): Classified {
  if (!word || word.includes("://")) return null;
  const pin = word.match(PIN);
  const path = pin ? pin[3] : word;
  const shaped = (PATH_LIKE.test(path) || ((backticked || pin) && NAME_WITH_EXT.test(path))) && isSafe(path);
  if (!shaped) return path.includes("/") && hasExtension(path) ? { unshaped: path } : null;
  return pin ? { ref: word, source: pin[1], path, anchor, pin: pin[2] } : { ref: word, source: null, path, anchor, pin: null };
}

export function extractReferences(text: string): ExtractedReferences {
  const refs = new Map<string, Reference>();
  const unshaped = new Set<string>();
  const take = (raw: string, backticked: boolean) => {
    const { word, anchor } = cleanToken(raw);
    const r = classify(word, anchor, backticked);
    if (!r) return;
    if ("unshaped" in r) {
      unshaped.add(r.unshaped);
      return;
    }
    const known = refs.get(r.ref);
    if (!known && refs.size < TOKEN_CAP) refs.set(r.ref, r);
    else if (known && !known.anchor) known.anchor = r.anchor;
  };
  const prose = String(text).replace(MARKDOWN_LINK, (_, target: string) => {
    take(decodePercent(target).replace(/^\.\//, ""), true);
    return " ";
  });
  for (const m of prose.matchAll(/`([^`\n]+)`|(\S+)/g)) take(m[1] ?? m[2], m[1] !== undefined);
  return { refs: [...refs.values()], unshaped: [...unshaped] };
}
