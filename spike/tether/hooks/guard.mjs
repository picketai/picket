import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const target = String(input.tool_input?.file_path ?? "").replaceAll("\\", "/");
if (/(^|\/)work\/[^/]+\/state\.yaml$/.test(target)) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "tether spike guard" },
    }),
  );
}
