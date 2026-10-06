#!/usr/bin/env node
// PreToolUse on Write | Edit: three mechanical rules.
//   1. Kernel-owned files are never written by a model: work/<id>/state.yaml, work/<id>/phases/*,
//      work/<id>/verdicts.jsonl, the intake record (request.md, story.md, sources.yaml, sources/,
//      repos.yaml), and everything under .claude/ledger/. `harness` writes them.
//   2. Nothing is written inside a source (any worktree of a repo declared in .claude/harness.json).
//   3. Read before edit: an Edit on a file this transcript never Read (or wrote) is denied, with
//      the instruction to read it first. In-context memory of a file is a belief, not the file.
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { wasRead, agentTranscript } from "./lib/transcript.mjs";
import { sourceRoots, underSource } from "./lib/source-paths.mjs";
import { projectRoot, stateRel } from "../lib/paths.mjs";

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const filePath = data.tool_input?.file_path;
if (!filePath) process.exit(0);

const root = projectRoot(data.cwd);
const rel = relative(root, resolve(data.cwd ?? root, filePath)).replaceAll("\\", "/");

function deny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `guard.scope: ${reason}` } }));
  process.exit(0);
}

if (/^work\/[^/]+\/(state\.yaml|verdicts\.jsonl|comments\.jsonl|phases\/|request\.md|story\.md|sources\.yaml|sources\/|repos\.yaml)/.test(rel)) deny(`${rel} is kernel-owned; use \`harness new\`, \`harness set\`, \`harness route\`, \`harness comment\` or \`harness source\`, never a direct write`);
if (rel.startsWith(`${stateRel("")}/`)) deny(`${rel} is written by the hooks only`);

const source = underSource(resolve(data.cwd ?? root, filePath), sourceRoots(root));
if (source) deny(`${filePath} is inside source ${source}, which is read-only; read it through \`harness source\` and the snapshots`);

// A subagent's reads live in its own transcript, not in the session file the payload names.
const own = agentTranscript(data);
if (data.tool_name === "Edit" && own && !wasRead(own, resolve(data.cwd ?? root, filePath))) {
  deny(`read ${rel} with the Read tool before editing it; the file may have changed since you last saw it`);
}
process.exit(0);
