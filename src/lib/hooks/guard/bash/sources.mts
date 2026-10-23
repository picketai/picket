import { isAbsolute, resolve } from "node:path";
import { normalizeRoot } from "../../../shared/shell/kernel-call.mts";
import { sourceRoots, underSource, type SourceRoot } from "../../../shared/sources/protection.mts";
import { nodePath } from "./bash.mts";
import {
  gitGlobalsAllowed,
  ruleOf,
  sedPrintOnly,
  SOURCE_GIT_READS,
  SOURCE_LISTING_FLAGS,
  stripGitGlobalOpts,
  writesWith,
  type Refusal,
  type Segment,
} from "./rules.mts";

export type SourceCheck = { hit: string | null; refusal: Refusal | null };

const SEGMENT_QUOTE_CHARS = 60;

function sourceGitAllowed(seg: Segment): boolean {
  if (!gitGlobalsAllowed(seg)) return false;
  const [, sub, ...rest] = stripGitGlobalOpts(seg);
  const args = rest.filter((t): t is string => typeof t === "string");
  if (args.some((t) => /^--output(=|$)/.test(t))) return false;
  if (sub === "grep" && args.some((t) => /^(-O|--open-files-in-pager)/.test(t))) return false;
  if (typeof sub === "string" && SOURCE_GIT_READS.has(sub)) return true;
  if (sub === "worktree") return args.length === 1 && args[0] === "list";
  if (sub === "branch" || sub === "tag") return args.every((t) => SOURCE_LISTING_FLAGS.has(t));
  return false;
}

export function sourceAllowed(seg: Segment): boolean {
  const root = normalizeRoot(seg[0]);
  if (typeof root !== "string") return false;
  if (root === "git") return sourceGitAllowed(seg);
  if (root === "sed") return sedPrintOnly(seg);
  const rule = ruleOf(root);
  return rule?.sourceReader === true && !writesWith(rule, seg);
}

export function segmentSource(seg: Segment, cwd: string | null, roots: SourceRoot[], platform: NodeJS.Platform): string | null {
  if (cwd) {
    const inCwd = underSource(cwd, roots, platform);
    if (inCwd) return inCwd;
  }
  for (const tok of seg.slice(1)) {
    if (typeof tok !== "string" || !tok) continue;
    const value = nodePath(tok.match(/^--?[\w-]+=(.+)$/)?.[1] ?? tok);
    if (value.startsWith("-") || (!cwd && !isAbsolute(value))) continue;
    const hit = underSource(cwd ? resolve(cwd, value) : value, roots, platform);
    if (hit) return hit;
  }
  return null;
}

export function redirectSource(targets: (string | null)[], cwds: (string | null)[], roots: SourceRoot[], platform: NodeJS.Platform): string | null {
  for (const t of targets) {
    if (typeof t !== "string" || !t) continue;
    const p = nodePath(t);
    for (const cwd of isAbsolute(p) ? [null] : cwds.filter(Boolean)) {
      const hit = underSource(cwd ? resolve(cwd, p) : p, roots, platform);
      if (hit) return hit;
    }
  }
  return null;
}

export function sourceDenial(name: string, what: string): string {
  return `guard.bash: ${what} acts inside source ${name}, which is read-only; read it through \`picket source\` and the snapshots, and never write, commit or run tools there.`;
}

export function protectedSources(root: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): SourceRoot[] {
  try {
    return sourceRoots(root, env, platform);
  } catch {
    return [];
  }
}

export function sourceCheck(seg: Segment, cwd: string | null, roots: SourceRoot[], platform: NodeJS.Platform): SourceCheck {
  const hit = roots.length ? segmentSource(seg, cwd, roots, platform) : null;
  if (!hit || sourceAllowed(seg)) return { hit, refusal: null };
  const quoted = seg.filter((t) => typeof t === "string").join(" ").slice(0, SEGMENT_QUOTE_CHARS);
  return { hit, refusal: { why: "source", reason: sourceDenial(hit, `\`${quoted}\``) } };
}
