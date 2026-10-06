import { relative, resolve } from "node:path";
import { wasRead, agentTranscript } from "../transcript.mjs";
import { sourceRoots, underSource } from "../source-paths.mjs";
import { MODEL_WRITABLE_STATE_FILES, stateRel } from "../paths.mjs";

const KERNEL_OWNED = /^work\/[^/]+\/(state\.yaml|verdicts\.jsonl|comments\.jsonl|phases\/|request\.md|story\.md|sources\.yaml|sources\/|repos\.yaml)/;

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `guard.scope: ${reason}` } };
}

function isHookOnlyState(rel) {
  return rel.startsWith(`${stateRel("")}/`) && !MODEL_WRITABLE_STATE_FILES.map(stateRel).includes(rel);
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
  if (KERNEL_OWNED.test(rel)) return deny(`${rel} is kernel-owned; use \`harness new\`, \`harness set\`, \`harness route\`, \`harness comment\` or \`harness source\`, never a direct write`);
  if (isHookOnlyState(rel)) return deny(`${rel} is written by the hooks only`);
  const source = underSource(abs, sourceRoots(root));
  if (source) return deny(`${filePath} is inside source ${source}, which is read-only; read it through \`harness source\` and the snapshots`);
  if (editsUnreadFile(event, abs)) return deny(`read ${rel} with the Read tool before editing it; the file may have changed since you last saw it`);
  return null;
}
