// The gate packet, rendered by code. The lead used to compose it from the developer's block by
// hand, so it came out as one dense paragraph with 40-word sentences and a Decisions line that
// wrapped three times. Now the hook saves the developer's block next to the phase markers and
// `harness packet <id>` renders a fixed shape with a width cap: what the user sees at a stop is the
// same every time, and the lead prints it verbatim.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARTIFACT_BY_LANE, deriveState, projectRoot, readArtifact, workDir } from "./work.mjs";
import { next } from "./next.mjs";
import { loadConfig } from "./config.mjs";
import { ambiguousRefs, candidates } from "./sources.mjs";

export const WIDTH = 100;
const LABEL = 10;

export function blockPath(id, n, root = projectRoot()) {
  return join(workDir(id, root), "phases", `${n}.block.md`);
}

/** Written by the route.verdict hook when a developer block lands; models never write here. */
export function saveBlock(id, n, text, root = projectRoot()) {
  mkdirSync(join(workDir(id, root), "phases"), { recursive: true });
  writeFileSync(blockPath(id, n, root), text.replace(/\r\n/g, "\n").trim() + "\n");
}

export function readBlock(id, n, root = projectRoot()) {
  const p = blockPath(id, n, root);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

/** The developer block: heading, one-sentence line, `Label: value` fields, verdict on the last line. */
export function parseBlock(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out = { title: null, headline: "", fields: {}, verdict: null };
  let i = 0;
  while (i < lines.length && !/^## /.test(lines[i])) i++;
  if (i < lines.length) {
    out.title = lines[i].replace(/^## /, "").trim();
    i++;
  }
  while (i < lines.length && !lines[i].trim()) i++;
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^[A-Z][a-z]+:\s/.test(lines[i])) para.push(lines[i].trim()), i++;
  out.headline = para.join(" ");
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Z][a-z]+):\s*(.*)$/);
    if (m) out.fields[m[1].toLowerCase()] = m[2].trim();
  }
  const last = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  if (/^(PHASE DONE|PHASE STALLED)$/.test(last)) out.verdict = last;
  return out;
}

export function cut(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

/**
 * First sentence, cut to the width: the headline is a claim, not a paragraph. A sentence that runs
 * past the width is cut at its last clause break (colon, semicolon, comma) so the claim survives
 * and the explanation goes.
 */
function firstSentence(s, n) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  const sentence = (t.match(/^(.+?[.!?])(\s|$)/) ?? [null, t])[1];
  if (sentence.length <= n) return sentence;
  const head = sentence.slice(0, n - 1);
  const brk = Math.max(head.lastIndexOf(": "), head.lastIndexOf("; "), head.lastIndexOf(", "));
  return brk > n / 2 ? head.slice(0, brk) + "…" : cut(sentence, n);
}

function field(label, value, width = WIDTH) {
  return `  ${label.padEnd(LABEL)}${cut(value, width - 2 - LABEL)}`;
}

/** As many whole paths as fit the width, then "+k more"; a path is never cut in half. */
function filesLine(value, width = WIDTH) {
  const room = width - 2 - LABEL;
  const parts = String(value ?? "")
    .replace(/\(\+\d+ more\)/, "")
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const extra = Number(String(value ?? "").match(/\+(\d+) more/)?.[1] ?? 0);
  const shown = [];
  for (const p of parts) {
    const candidate = [...shown, p].join(", ");
    const remaining = parts.length - shown.length - 1 + extra;
    const tail = remaining > 0 ? `, +${remaining} more` : "";
    if (shown.length && candidate.length + tail.length > room) break;
    shown.push(p);
  }
  const more = parts.length - shown.length + extra;
  return cut(shown.join(", ") + (more > 0 ? `, +${more} more` : ""), room);
}

function decisionLines(value, width = WIDTH) {
  const v = String(value ?? "").trim();
  if (!v || /^none$/i.test(v)) return [];
  const items = v.split(/;\s+|\n/).map((s) => s.trim()).filter(Boolean);
  const shown = items.slice(0, 3).map((d) => `  ${"".padEnd(LABEL)}· ${cut(d, width - LABEL - 4)}`);
  if (items.length > 3) shown.push(`  ${"".padEnd(LABEL)}· +${items.length - 3} more in the phase block`);
  return shown;
}

/** One line per version of an ambiguous reference: label, branch, short commit, dirty flag. */
function describeCandidates(ref, root) {
  const source = loadConfig(root).sources.find((s) => s.name === ref.source);
  if (!source?.root) return (ref.candidates ?? []).map((label) => `${label} (source ${ref.source} unreachable)`);
  return candidates(source, ref.path).map((c) => {
    const branch = c.branch === c.label ? "" : ` (${c.branch ? `branch ${c.branch}` : "detached"})`;
    return `${c.label}${branch} @ ${String(c.commit ?? "").slice(0, 8)}${c.dirty ? " · uncommitted changes" : ""} · ${c.worktree ?? "branch only, no worktree"}`;
  });
}

/**
 * The lines the lead prints at a stop, for whatever `harness next` says. Empty options means no
 * decision is due and the packet is a status line.
 */
export function packet(id, root = projectRoot(), { width = WIDTH } = {}) {
  const s = deriveState(id, root);
  const n = next(id, root);
  const lines = [];
  const options = n.options?.length ? n.options.join("   ") : null;

  if (n.action === "approve_phase" && s.lane !== "research") {
    const raw = readBlock(id, n.phase, root);
    const b = parseBlock(raw ?? "");
    const total = s.phase_count;
    lines.push(`▶ phase ${n.phase}/${total} done · ${id}`);
    lines.push(`  ${firstSentence(b.headline || s.phases.find((p) => p.n === n.phase)?.title || "phase complete", width - 2)}`);
    lines.push("");
    lines.push(field("tests", b.fields.tests ?? "not reported", width));
    lines.push(field("lint", b.fields.lint ?? "not reported", width));
    lines.push(field("verified", b.fields.verified ?? "not reported", width));
    lines.push(field("files", b.fields.files ? filesLine(b.fields.files, width) : "not reported", width));
    const dec = decisionLines(b.fields.decisions, width);
    if (dec.length) {
      lines.push(`  ${"decisions".padEnd(LABEL)}${dec[0].slice(2 + LABEL)}`);
      lines.push(...dec.slice(1));
    }
    // The developer stages and proposes a message; approval is what commits.
    if (b.fields.commit) lines.push(field("commit", `${b.fields.commit.replace(/\s*\(staged.*\)$/i, "")}  (staged; approval commits it)`, width));
  } else if (n.action === "approve_phase") {
    const art = readArtifact(id, root);
    const summary = art.body.match(/^## Summary\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
    const findings = (art.body.match(/^- \*\*R-\d{3}\*\*|^### R-\d{3}|^R-\d{3}/gm) ?? []).length;
    const deep = !/pending deep pass/i.test(art.body);
    lines.push(`▶ ${deep ? "report" : "outline"} ready · ${id}`);
    lines.push(`  ${firstSentence(summary || s.title, width - 2)}`);
    lines.push("");
    lines.push(field("report", `work/${id}/${ARTIFACT_BY_LANE.research}`, width));
    lines.push(field("findings", String(findings), width));
  } else if (n.action === "resolve_sources") {
    lines.push(`▶ source references differ · ${id}`);
    lines.push(`  ${cut(`${n.detail}; pick one version of each`, width - 2)}`);
    for (const ref of ambiguousRefs(workDir(id, root))) {
      lines.push("", `  ${cut(ref.ref, width - 2)}`);
      for (const c of describeCandidates(ref, root)) lines.push(`    ${cut(c, width - 4)}`);
    }
  } else if (n.action === "resolve_block") {
    const raw = s.current_phase ? readBlock(id, s.current_phase, root) : null;
    const b = parseBlock(raw ?? "");
    lines.push(`▶ blocked · ${id}`);
    lines.push(`  ${cut(s.blocked_reason ?? n.detail, width - 2)}`);
    if (b.headline) lines.push("", field("developer", firstSentence(b.headline, width - 2 - LABEL), width));
  } else {
    lines.push(`▶ ${n.action.replace(/_/g, " ")}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` · phase ${n.phase}` : ""} · ${id}`);
    lines.push(`  ${cut(n.detail, width - 2)}`);
  }
  if (options) lines.push("", options);
  return { lines, text: lines.join("\n"), next: n };
}
