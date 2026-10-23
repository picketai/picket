import type { HookEvent, HookName } from "../hooks.mts";
import type { Context } from "../shared/context.mts";
import type { BounceOutput, ContextOutput, PermissionOutput } from "./output.mts";

export type CommonPayload = { session_id?: string; transcript_path?: string; cwd?: string; permission_mode?: string; agent_type?: string };
type ToolInput = { file_path?: string; command?: string } & Record<string, unknown>;
type ToolPayload = CommonPayload & { tool_name?: string; tool_input?: ToolInput };
type StopPayload = CommonPayload & { stop_hook_active?: boolean };
type NotificationPayload = CommonPayload & { notification_type?: string; message?: string };

type Payloads = {
  SessionStart: CommonPayload;
  SubagentStart: CommonPayload;
  PreToolUse: ToolPayload;
  PostToolUse: ToolPayload;
  PostToolUseFailure: ToolPayload;
  Stop: StopPayload;
  SubagentStop: StopPayload;
  Notification: NotificationPayload;
};

export type PayloadOf<E extends HookEvent> = { [K in E]: Payloads[K] & { hook_event_name: K } }[E];

export type OutputFor<E extends HookEvent> = E extends "PreToolUse"
  ? PermissionOutput
  : E extends "SessionStart" | "SubagentStart" | "PostToolUse" | "PostToolUseFailure"
    ? ContextOutput
    : E extends "Stop" | "SubagentStop"
      ? BounceOutput | ContextOutput
      : never;

export type HookContext = Context & { name: HookName };

export type HookSpec<E extends HookEvent> = {
  handler: (event: PayloadOf<E>, ctx: HookContext) => Promise<OutputFor<E> | null>;
  onBadInput?: "empty";
};
