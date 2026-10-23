import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type SkillDescription = { name: string; path: string; description: string | null };
export type Vector = Map<string, number>;
export type RoutingModel = { idf: Vector; vectors: { name: string; vector: Vector }[] };
export type Ranked = { name: string; score: number };
export type SimilarPair = { a: string; b: string; score: number };

function frontmatterDescription(text: string): string | null {
  const fm = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const lines = fm[1].split("\n");
  const start = lines.findIndex((l) => /^description:/.test(l));
  if (start < 0) return "";
  const head = lines[start].replace(/^description:\s*/, "");
  if (!/^(>-?|\|-?)?\s*$/.test(head)) return head.replace(/\s+/g, " ").trim();
  const folded = [];
  for (let i = start + 1; i < lines.length && /^\s+\S/.test(lines[i]); i++) folded.push(lines[i].trim());
  return folded.join(" ").replace(/\s+/g, " ").trim();
}

export function skillDescriptions(root: string): SkillDescription[] {
  const dir = join(root, "src", "skills");
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "SKILL.md")))
    .map((entry) => {
      const path = join(dir, entry.name, "SKILL.md");
      return { name: entry.name, path, description: frontmatterDescription(readFileSync(path, "utf8")) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const SUFFIXES = ["ing", "ed", "es", "s"];
const MIN_STEM = 3;

function stem(word: string): string {
  const suffix = SUFFIXES.find((s) => word.endsWith(s) && word.length - s.length >= MIN_STEM);
  return suffix ? word.slice(0, -suffix.length) : word;
}

export function terms(text: unknown): string[] {
  return (String(text).toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? []).map(stem);
}

function counts(words: string[]): Vector {
  const tf: Vector = new Map();
  for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
  return tf;
}

function weigh(tf: Vector, idf: Vector): Vector {
  const vector: Vector = new Map();
  for (const [term, n] of tf) {
    const weight = idf.get(term);
    if (weight !== undefined) vector.set(term, n * weight);
  }
  return vector;
}

export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  for (const [term, w] of a) dot += w * (b.get(term) ?? 0);
  const norm = (v: Vector) => Math.sqrt([...v.values()].reduce((sum, w) => sum + w * w, 0));
  const denominator = norm(a) * norm(b);
  return denominator ? dot / denominator : 0;
}

export function vectorise(docs: { name: string; description: string | null }[]): RoutingModel {
  const bags = docs.map(({ name, description }) => counts([...terms(name), ...terms(name), ...terms(description)]));
  const df: Vector = new Map();
  for (const bag of bags) for (const term of bag.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const idf: Vector = new Map([...df].map(([term, n]) => [term, Math.log(1 + docs.length / n)]));
  return { idf, vectors: docs.map(({ name }, i) => ({ name, vector: weigh(bags[i], idf) })) };
}

export function rank(prompt: string, { idf, vectors }: RoutingModel): Ranked[] {
  const query = weigh(counts(terms(prompt)), idf);
  return vectors.map(({ name, vector }) => ({ name, score: cosine(query, vector) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function similarPairs(model: RoutingModel, threshold: number): SimilarPair[] {
  const pairs: SimilarPair[] = [];
  const { vectors } = model;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const score = cosine(vectors[i].vector, vectors[j].vector);
      if (score >= threshold) pairs.push({ a: vectors[i].name, b: vectors[j].name, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}
