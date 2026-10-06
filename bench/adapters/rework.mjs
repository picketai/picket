// Adapter for the rework harness (branch `rework`): lanes, gate packets with bracket options, and
// the closing blocks the lane skills print.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { filesMatching } from "../lib/grade.mjs";
import * as trunk from "./trunk.mjs";

export const name = "rework";

const SKIP = ["ledger", "settings.local.json", "PROJECT-MAP.md", "branching"];

export const REPOSITORY_ONLY = ["rules/harness-authoring.md"];

const WINDOWS_LONG_PATH_PREFIX = "\\\\?\\";

function withoutLongPathPrefix(path) {
  return path.startsWith(WINDOWS_LONG_PATH_PREFIX) ? path.slice(WINDOWS_LONG_PATH_PREFIX.length) : path;
}

export function isRepositoryOnly(src, hostDir) {
  const rel = relative(hostDir, withoutLongPathPrefix(src)).replaceAll("\\", "/");
  return REPOSITORY_ONLY.includes(rel);
}

const CONFIG_FILE = [".tether", "config.json"];

export function copyConfig(repo, harnessRoot) {
  const config = join(harnessRoot, ...CONFIG_FILE);
  if (!existsSync(config)) return;
  mkdirSync(join(repo, CONFIG_FILE[0]), { recursive: true });
  cpSync(config, join(repo, ...CONFIG_FILE));
}

export function install(repo, harnessRoot) {
  if (!existsSync(join(harnessRoot, ".claude", "bin", "harness.mjs"))) throw new Error(`not a rework harness root: ${harnessRoot}`);
  cpSync(join(harnessRoot, "CLAUDE.md"), join(repo, "CLAUDE.md"));
  copyConfig(repo, harnessRoot);
  const hostDir = join(harnessRoot, ".claude");
  cpSync(hostDir, join(repo, ".claude"), {
    recursive: true,
    filter: (src) => !SKIP.some((s) => src.replaceAll("\\", "/").includes(`/.claude/${s}`)) && !isRepositoryOnly(src, hostDir),
  });
  cpSync(join(harnessRoot, "core"), join(repo, "core"), { recursive: true });
  mkdirSync(join(repo, "work"), { recursive: true });
  rmSync(join(repo, ".claude", "settings.local.json"), { force: true });
}

/** Gate packets end with bracket options; the eager approver picks the most permissive safe one. */
export function gate(text, task) {
  const tail = text.slice(-1500);
  if (/\[i\]\s*confirm irreversible/i.test(tail)) return { isGate: true, kind: "irreversible", reply: "i" };
  const run = tail.match(/\[r\]\s*run through\s*(\d+)/i);
  if (run) return { isGate: true, kind: "approval", reply: `r ${run[1]}` };
  if (/\[d\]\s*deep pass/i.test(tail)) return { isGate: true, kind: "approval", reply: "d" };
  if (/\[a\]\s*(approve|accept)/i.test(tail)) return { isGate: true, kind: "approval", reply: "a" };
  if (/\[c\]\s*(continue|close|commit)/i.test(tail)) return { isGate: true, kind: /fresh developer|redesign/i.test(tail) ? "stalled" : "approval", reply: "c" };
  if (/^\s*PREFLIGHT FAILED|\bask(ing)? (you|the user)\b.*\?/im.test(tail) && /\?\s*$/.test(tail.trim())) return { isGate: true, kind: "ask", reply: task.answer ?? "Proceed with your recommended option; do not ask again unless blocked." };
  return trunk.gate(text, task);
}

const LANE_HEADINGS = [
  [/^##\s+Expedited:/m, "fast"],
  [/^##\s+Order closed:/m, "order"],
  [/^##\s+Design closed:/m, "design"],
  [/^##\s+Report:|\boutline ready\b/m, "research"],
];

export function signals(texts, summary) {
  const text = texts.join("\n");
  let lane = null;
  for (const [re, l] of LANE_HEADINGS) if (re.test(text)) lane = l;
  if (!lane) lane = text.match(/\blane:\s*(fast|order|design|research)\b/i)?.[1]?.toLowerCase() ?? null;
  const verdicts = [...text.matchAll(/^(APPROVED|CHANGES REQUIRED|ALIGNED|DRIFT DETECTED|PHASE DONE|PHASE STALLED|ARTIFACT WRITTEN|REPORT WRITTEN|AMENDED)\s*$/gm)].map((m) => m[1]);
  const base = trunk.signals(texts, summary);
  return { lane: lane ?? base.lane, verdicts: verdicts.length ? verdicts : base.verdicts, route: `${lane ?? base.lane}:${[...new Set(verdicts.length ? verdicts : base.verdicts)].join(">") || "-"}` };
}

export function reportFiles(repo) {
  return [...filesMatching(repo, "work/*/research.md"), ...filesMatching(repo, "artifacts/reports/*.md")];
}

export const allowedTools = trunk.allowedTools;
