import { frontmatter } from "../../util/yaml-lite.mts";

export type GrepEntry = { path: string; pattern: string; flags?: string };
export type PhaseEntry = { n: number; files?: string[]; greps?: GrepEntry[]; tests?: boolean; drive?: boolean; security?: unknown } & Record<string, unknown>;
export type ArtifactPhase = { n: number; title: string; entry: PhaseEntry | null; touchSet: string[]; irreversible: boolean };
export type ParsedArtifact = { front: Record<string, unknown>; body: string; phases: ArtifactPhase[] };

const PHASE_HEADING = /^## Phase (\d+)(?::|\s+-|\s+—)?\s*(.*)$/gm;
const FENCED_BLOCK = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;
const INLINE_CODE = /(`+)[^\n]*?\1/g;
const BACKTICK_RUN = /`+/g;
const IRREVERSIBLE = /\[IRREVERSIBLE\]/;

function hasUnpairedBacktick(line: string): boolean {
  const runsByLength = new Map<number, number>();
  for (const run of line.match(BACKTICK_RUN) ?? []) runsByLength.set(run.length, (runsByLength.get(run.length) ?? 0) + 1);
  return [...runsByLength.values()].some((count) => count % 2 === 1);
}

function lineWithoutCode(line: string): string {
  return hasUnpairedBacktick(line) ? line : line.replace(INLINE_CODE, "");
}

function withoutCode(section: string): string {
  return section.replace(FENCED_BLOCK, "").split("\n").map(lineWithoutCode).join("\n");
}

function phaseEntry(front: Record<string, unknown>, n: number): PhaseEntry | null {
  const phases: unknown[] = Array.isArray(front?.phases) ? front.phases : [];
  return (phases.find((p) => Number((p as PhaseEntry | null)?.n) === n) as PhaseEntry | undefined) ?? null;
}

function phaseSection(body: string, n: number): string {
  const re = new RegExp(`^## Phase ${n}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  return body.match(re)?.[1] ?? "";
}

function touchSetPaths(section: string): string[] {
  const block = section.match(/^\*\*Touch set:\*\*[^\n]*\n([\s\S]*?)(?=^\*\*|(?![\s\S]))/m)?.[1] ?? "";
  return block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.match(/`([^`]+)`/)?.[1])
    .filter((path): path is string => Boolean(path));
}

function entryFiles(entry: PhaseEntry | null): string[] {
  return Array.isArray(entry?.files) ? entry.files.map(String) : [];
}

function parsePhase(front: Record<string, unknown>, body: string, heading: RegExpMatchArray): ArtifactPhase {
  const n = Number(heading[1]);
  const section = phaseSection(body, n);
  return { n, title: heading[2].trim(), entry: phaseEntry(front, n), touchSet: touchSetPaths(section), irreversible: IRREVERSIBLE.test(withoutCode(section)) };
}

export function parseArtifact(text: string): ParsedArtifact {
  const { front, body } = frontmatter(text) as { front: Record<string, unknown>; body: string };
  return { front, body, phases: [...body.matchAll(PHASE_HEADING)].map((heading) => parsePhase(front, body, heading)) };
}

export function phasePaths(phase: Pick<ArtifactPhase, "entry" | "touchSet">): string[] {
  return [...new Set([...entryFiles(phase.entry), ...phase.touchSet])];
}
