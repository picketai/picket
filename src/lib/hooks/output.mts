import type { HookEvent } from "../hooks.mts";

type PermissionDecision = "allow" | "ask" | "deny";

export type PermissionOutput = { hookSpecificOutput: { hookEventName: "PreToolUse"; permissionDecision: PermissionDecision; permissionDecisionReason: string } };
export type ContextOutput = { hookSpecificOutput: { hookEventName: HookEvent; additionalContext: string } };
export type BounceOutput = { decision: "block"; reason: string };
export type HookOutput = PermissionOutput | ContextOutput | BounceOutput;

function permission(decision: PermissionDecision, reason: string): PermissionOutput {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason } };
}

export function allow(reason: string): PermissionOutput {
  return permission("allow", reason);
}

export function ask(reason: string): PermissionOutput {
  return permission("ask", reason);
}

export function deny(reason: string): PermissionOutput {
  return permission("deny", reason);
}

export function fallThrough(): null {
  return null;
}

export function context(event: HookEvent, text: string): ContextOutput {
  return { hookSpecificOutput: { hookEventName: event, additionalContext: text } };
}

export function bounce(reason: string): BounceOutput {
  return { decision: "block", reason };
}
