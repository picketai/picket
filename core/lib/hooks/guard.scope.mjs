import { relative, resolve } from "node:path";
import { wasRead, agentTranscript } from "../transcript.mjs";
import { sourceRoots, underSource } from "../source-paths.mjs";
import { LEGACY, MODEL_WRITABLE_STATE_FILES, stateRel } from "../paths.mjs";

const KERNEL_OWNED = /^work\/[^/]+\/(state\.yaml|verdicts\.jsonl|comments\.jsonl|phases\/|request\.md|story\.md|sources\.yaml|sources\/|repos\.yaml)/;
const STATE_PREFIX = `${stateRel("")}/`.toLowerCase();
const MODEL_WRITABLE_STATE = MODEL_WRITABLE_STATE_FILES.map((name) => stateRel(name).toLowerCase());
const LEGACY_STATE_PREFIX = `${LEGACY.stateDir}/`;

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `guard.scope: ${reason}` } };
}

function isHookOnlyState(rel) {
  const path = rel.toLowerCase();
  return path.startsWith(STATE_PREFIX) && !MODEL_WRITABLE_STATE.includes(path);
}

function isLegacyState(rel) {
  return rel.toLowerCase().startsWith(LEGACY_STATE_PREFIX.toLowerCase());
}

function editsUnreadFile(event, abs) {
  const own = agentTranscript(event);
  return event.tool_name === "Edit" && own && !wasRead(own, abs);
}

export function guardScope(event, { root }) {
  const filePath = event.tool_input?.file_path;
  if (!filePath) return null;
  const abs = resolve(event.cwd ?? root, filePath);
  const rel = relative(root, abs).replaceAll("\\", "/");
  if (KERNEL_OWNED.test(rel)) return deny(`${rel} is kernel-owned; use \`tether new\`, \`tether set\`, \`tether route\`, \`tether comment\` or \`tether source\`, never a direct write`);
  if (isHookOnlyState(rel)) return deny(`${rel} is written by the hooks only`);
  if (isLegacyState(rel)) return deny(`${rel} is under the legacy state folder ${LEGACY_STATE_PREFIX}; only \`tether migrate\` moves files out of it, nothing writes into it`);
  const source = underSource(abs, sourceRoots(root));
  if (source) return deny(`${filePath} is inside source ${source}, which is read-only; read it through \`tether source\` and the snapshots`);
  if (editsUnreadFile(event, abs)) return deny(`read ${rel} with the Read tool before editing it; the file may have changed since you last saw it`);
  return null;
}
