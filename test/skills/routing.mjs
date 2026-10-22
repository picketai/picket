import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function frontmatterDescription(text) {
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

export function skillDescriptions(root) {
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

function stem(word) {
  const suffix = SUFFIXES.find((s) => word.endsWith(s) && word.length - s.length >= MIN_STEM);
  return suffix ? word.slice(0, -suffix.length) : word;
}

export function terms(text) {
  return (String(text).toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? []).map(stem);
}

function counts(words) {
  const tf = new Map();
  for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
  return tf;
}

function weigh(tf, idf) {
  const vector = new Map();
  for (const [term, n] of tf) if (idf.has(term)) vector.set(term, n * idf.get(term));
  return vector;
}

export function cosine(a, b) {
  let dot = 0;
  for (const [term, w] of a) dot += w * (b.get(term) ?? 0);
  const norm = (v) => Math.sqrt([...v.values()].reduce((sum, w) => sum + w * w, 0));
  const denominator = norm(a) * norm(b);
  return denominator ? dot / denominator : 0;
}

export function vectorise(docs) {
  const bags = docs.map(({ name, description }) => counts([...terms(name), ...terms(name), ...terms(description)]));
  const df = new Map();
  for (const bag of bags) for (const term of bag.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const idf = new Map([...df].map(([term, n]) => [term, Math.log(1 + docs.length / n)]));
  return { idf, vectors: docs.map(({ name }, i) => ({ name, vector: weigh(bags[i], idf) })) };
}

export function rank(prompt, { idf, vectors }) {
  const query = weigh(counts(terms(prompt)), idf);
  return vectors.map(({ name, vector }) => ({ name, score: cosine(query, vector) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function similarPairs(model, threshold) {
  const pairs = [];
  const { vectors } = model;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const score = cosine(vectors[i].vector, vectors[j].vector);
      if (score >= threshold) pairs.push({ a: vectors[i].name, b: vectors[j].name, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}
