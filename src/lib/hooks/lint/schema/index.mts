import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { loadConfig } from "../../../shared/config.mjs";
import { frontmatter } from "../../../util/yaml-lite.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type ArtifactLane = "order" | "design";
type GrepEntry = { path?: string; pattern?: string; flags?: string };
type PhaseEntry = { n?: unknown; files?: unknown; greps?: unknown; security?: unknown };
type PhaseCheck = { problems: string[]; headings: number[] };
type DecisionSection = { r: number; body: string };

const ARTIFACT = /^work\/[^/]+\/(order|design)\.md$/;

function hasValidSecurityMark(entry: PhaseEntry | null, lane: ArtifactLane): boolean {
  if (entry == null || !Object.hasOwn(entry, "security")) return lane !== "design";
  return typeof entry.security === "boolean";
}

function grepProblems(p: PhaseEntry): string[] {
  const problems: string[] = [];
  const greps: (GrepEntry | null)[] = Array.isArray(p.greps) ? p.greps : [];
  for (const g of greps) {
    if (!g?.path || !g?.pattern) {
      problems.push(`phases[n=${p.n}].greps entries need path and pattern`);
      continue;
    }
    try {
      new RegExp(g.pattern, g.flags ?? "m");
    } catch (err) {
      problems.push(`phases[n=${p.n}] grep pattern ${JSON.stringify(g.pattern)} is not a valid regex: ${(err as Error).message}`);
    }
    if (/\\\\/.test(g.pattern)) problems.push(`phases[n=${p.n}] grep pattern ${JSON.stringify(g.pattern)} contains a doubled backslash after parsing; write the regex once, e.g. pattern: lines\\[0\\]\\.quantity`);
  }
  return problems;
}

function phaseProblems(front: Record<string, unknown>, body: string, lane: ArtifactLane): PhaseCheck {
  const problems: string[] = [];
  const fmPhases: PhaseEntry[] = Array.isArray(front.phases) ? front.phases : [];
  const headings = [...body.matchAll(/^## Phase (\d+)/gm)].map((m) => Number(m[1]));
  headings.forEach((n, i) => {
    if (n !== i + 1) problems.push(`phase headings must run 1, 2, 3; found ${headings.join(", ")}`);
  });
  for (const h of headings) if (!fmPhases.some((p) => Number(p.n) === h)) problems.push(`phase ${h} has no frontmatter entry (n, files, tests, drive)`);
  for (const p of fmPhases) {
    if (!Array.isArray(p.files)) problems.push(`phases[n=${p.n}].files must be a list`);
    if (!headings.includes(Number(p.n))) problems.push(`frontmatter phase ${p.n} has no "## Phase ${p.n}" heading`);
    if (!hasValidSecurityMark(p, lane)) problems.push(`phases[n=${p.n}].security must be true or false`);
    problems.push(...grepProblems(p));
  }
  return { problems, headings };
}

function capProblems(body: string, lane: ArtifactLane, headings: number[], root: string): string[] {
  const problems: string[] = [];
  const { max_phases: maxPhases, max_decisions: maxDecisions } = loadConfig(root).lanes[lane];
  if (headings.length > maxPhases) problems.push(`${headings.length} phases; the ${lane} cap is ${maxPhases}`);
  const ids = [...body.matchAll(/^### (D-\d{3})(?: \(r(\d+)\))?:/gm)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate decision ids: ${[...new Set(dupes)].join(", ")}`);
  if (ids.length > maxDecisions) problems.push(`${ids.length} decisions; the ${lane} cap is ${maxDecisions}`);
  for (const m of body.matchAll(/^## Phase \d+[^\n]*\n([\s\S]*?)(?=^## |\s*$)/gm)) {
    const crit = (m[1].match(/^- \*\*T-\d+\.\d+\*\*/gm) ?? []).length;
    if (crit && (crit < 3 || crit > 8)) problems.push(`a phase has ${crit} criteria; 3 to 8 required`);
  }
  return problems;
}

function leftoverProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\[REPLACE:/.test(text)) problems.push("unfilled [REPLACE:] placeholder left in the file");
  if (/<!--/.test(text)) problems.push("template comment left in the file");
  return problems;
}

function committedVersion(root: string, rel: string): string | null {
  try {
    return execFileSync("git", ["-C", root, "show", `HEAD:${rel}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function decisionSections(text: string): Record<string, DecisionSection> {
  return Object.fromEntries([...text.matchAll(/^### (D-\d{3})(?: \(r(\d+)\))?:[^\n]*\n([\s\S]*?)(?=^### |^## |\s*$)/gm)].map((m) => [m[1], { r: Number(m[2] ?? 1), body: m[3].trim() }]));
}

function revisionLogLines(text: string): number {
  return (text.match(/^- \d{4}-\d{2}-\d{2}:/gm) ?? []).length;
}

function revisionProblems(head: string | null, body: string): string[] {
  if (!head) return [];
  const problems: string[] = [];
  const before = decisionSections(head);
  const after = decisionSections(body);
  let changed = 0;
  for (const [id, a] of Object.entries(after)) {
    const b = before[id];
    if (!b) continue;
    if (a.r < b.r) problems.push(`${id} revision marker went backwards (r${b.r} to r${a.r})`);
    if (a.body !== b.body) {
      changed++;
      if (a.r <= b.r) problems.push(`${id} body changed without bumping its marker to (r${b.r + 1})`);
    }
  }
  for (const id of Object.keys(before)) if (!after[id]) problems.push(`${id} was deleted; withdraw it with [withdrawn] instead`);
  if (changed && revisionLogLines(body) <= revisionLogLines(head)) problems.push("a decision changed but no line was appended to ## Revision log");
  return problems;
}

function artifactProblems(abs: string, rel: string, root: string): string[] {
  const text = readFileSync(abs, "utf8");
  const { front, body } = frontmatter(text);
  const lane: ArtifactLane = rel.endsWith("order.md") ? "order" : "design";
  const problems = front.lane !== lane ? [`frontmatter lane must be ${lane}`] : [];
  const phases = phaseProblems(front, body, lane);
  problems.push(...phases.problems, ...capProblems(body, lane, phases.headings, root), ...leftoverProblems(text));
  problems.push(...revisionProblems(committedVersion(root, rel), body));
  return problems;
}

export function lintSchema(event: PayloadOf<"PostToolUse">, { root }: HookContext): ContextOutput | null {
  const filePath = event.tool_input?.file_path;
  if (!filePath) return null;
  const abs = resolve(event.cwd ?? root, filePath);
  const rel = relative(root, abs).replaceAll("\\", "/");
  if (!ARTIFACT.test(rel) || !existsSync(abs)) return null;
  let problems: string[];
  try {
    problems = artifactProblems(abs, rel, root);
  } catch (err) {
    problems = [`could not parse ${rel}: ${(err as Error).message}`];
  }
  if (!problems.length) return null;
  return context("PostToolUse", `lint.schema on ${rel}:\n- ${problems.join("\n- ")}\nFix these before ending the turn.`);
}

export const hook: HookSpec<"PostToolUse"> = {
  handler: async (event, ctx) => lintSchema(event, ctx),
};
