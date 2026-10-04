#!/usr/bin/env node
// PostToolUse on Write | Edit under work/: validate the artifact the model just wrote and feed the
// violations back as context. Checks the frontmatter (lane, phases with n and files), the phase
// headings (contiguous from 1, one per frontmatter entry), decision IDs (unique), the caps, and the
// revision protocol (a changed D-### body against git HEAD needs a bumped (rN) marker and a new
// Revision log line). Never blocks: a bounced write costs a turn; a listed violation costs a line.
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { frontmatter } from "../lib/yaml-lite.mjs";
import { projectRoot } from "../lib/work.mjs";

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const filePath = data.tool_input?.file_path;
if (!filePath) process.exit(0);
const root = projectRoot(data.cwd);
const abs = resolve(data.cwd ?? root, filePath);
const rel = relative(root, abs).replaceAll("\\", "/");
if (!/^work\/[^/]+\/(order|design)\.md$/.test(rel) || !existsSync(abs)) process.exit(0);

const problems = [];
try {
  const text = readFileSync(abs, "utf8");
  const { front, body } = frontmatter(text);
  const lane = rel.endsWith("order.md") ? "order" : "design";
  if (front.lane !== lane) problems.push(`frontmatter lane must be ${lane}`);
  const fmPhases = Array.isArray(front.phases) ? front.phases : [];
  const headings = [...body.matchAll(/^## Phase (\d+)/gm)].map((m) => Number(m[1]));
  headings.forEach((n, i) => {
    if (n !== i + 1) problems.push(`phase headings must run 1, 2, 3; found ${headings.join(", ")}`);
  });
  for (const h of headings) if (!fmPhases.some((p) => Number(p.n) === h)) problems.push(`phase ${h} has no frontmatter entry (n, files, tests, drive)`);
  for (const p of fmPhases) {
    if (!Array.isArray(p.files)) problems.push(`phases[n=${p.n}].files must be a list`);
    if (!headings.includes(Number(p.n))) problems.push(`frontmatter phase ${p.n} has no "## Phase ${p.n}" heading`);
    // A grep must_have that can never match stalls the developer on a defect it may not fix.
    for (const g of Array.isArray(p.greps) ? p.greps : []) {
      if (!g?.path || !g?.pattern) {
        problems.push(`phases[n=${p.n}].greps entries need path and pattern`);
        continue;
      }
      try {
        new RegExp(g.pattern, g.flags ?? "m");
      } catch (err) {
        problems.push(`phases[n=${p.n}] grep pattern ${JSON.stringify(g.pattern)} is not a valid regex: ${err.message}`);
      }
      if (/\\\\/.test(g.pattern)) problems.push(`phases[n=${p.n}] grep pattern ${JSON.stringify(g.pattern)} contains a doubled backslash after parsing; write the regex once, e.g. pattern: lines\\[0\\]\\.quantity`);
    }
  }
  const maxPhases = lane === "order" ? 3 : 10;
  if (headings.length > maxPhases) problems.push(`${headings.length} phases; the ${lane} cap is ${maxPhases}`);
  const decisions = [...body.matchAll(/^### (D-\d{3})(?: \(r(\d+)\))?:/gm)];
  const ids = decisions.map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate decision ids: ${[...new Set(dupes)].join(", ")}`);
  const maxDecisions = lane === "order" ? 5 : 8;
  if (ids.length > maxDecisions) problems.push(`${ids.length} decisions; the ${lane} cap is ${maxDecisions}`);
  for (const m of body.matchAll(/^## Phase \d+[^\n]*\n([\s\S]*?)(?=^## |\s*$)/gm)) {
    const crit = (m[1].match(/^- \*\*T-\d+\.\d+\*\*/gm) ?? []).length;
    if (crit && (crit < 3 || crit > 8)) problems.push(`a phase has ${crit} criteria; 3 to 8 required`);
  }
  if (/\[REPLACE:/.test(text)) problems.push("unfilled [REPLACE:] placeholder left in the file");
  if (/<!--/.test(text)) problems.push("template comment left in the file");

  // revision protocol against git HEAD
  let head = null;
  try {
    head = execFileSync("git", ["-C", root, "show", `HEAD:${rel}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {}
  if (head) {
    const sections = (t) => Object.fromEntries([...t.matchAll(/^### (D-\d{3})(?: \(r(\d+)\))?:[^\n]*\n([\s\S]*?)(?=^### |^## |\s*$)/gm)].map((m) => [m[1], { r: Number(m[2] ?? 1), body: m[3].trim() }]));
    const before = sections(head);
    const after = sections(body);
    const logBefore = (head.match(/^- \d{4}-\d{2}-\d{2}:/gm) ?? []).length;
    const logAfter = (body.match(/^- \d{4}-\d{2}-\d{2}:/gm) ?? []).length;
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
    if (changed && logAfter <= logBefore) problems.push("a decision changed but no line was appended to ## Revision log");
  }
} catch (err) {
  problems.push(`could not parse ${rel}: ${err.message}`);
}

if (problems.length) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `lint.schema on ${rel}:\n- ${problems.join("\n- ")}\nFix these before ending the turn.` } }));
}
process.exit(0);
