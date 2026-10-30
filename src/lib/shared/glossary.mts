import { hostRel } from "./paths.mts";

export const GLOSSARY_CHARS = 6000;

const CUT_NOTE = `Cut at ${GLOSSARY_CHARS.toLocaleString("en-US")} characters; read ${hostRel("MEMORY.md")} for the rest.`;

export function glossaryBody(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

function lineStarts(body: string): number[] {
  const starts = [0];
  for (let i = body.indexOf("\n"); i !== -1; i = body.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

function startsEntry(body: string, start: number): boolean {
  const line = body.slice(start, start + 4);
  return line.startsWith("## ") || line.startsWith("- **") || (line.startsWith("**") && body.slice(start - 2, start) === "\n\n");
}

function cutPoint(body: string): number {
  const inRange = lineStarts(body).filter((start) => start > 0 && start <= GLOSSARY_CHARS + 1);
  return inRange.filter((start) => startsEntry(body, start)).at(-1) ?? inRange.at(-1) ?? 0;
}

export function injectedGlossary(raw: string): string {
  const body = glossaryBody(raw);
  if (body.length <= GLOSSARY_CHARS) return body;
  const kept = body.slice(0, cutPoint(body)).trimEnd();
  return kept ? `${kept}\n\n${CUT_NOTE}` : CUT_NOTE;
}
