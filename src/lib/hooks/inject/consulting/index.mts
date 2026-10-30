import type { HookSpec } from "../../hook-spec.mts";
import { context } from "../../output.mts";

export const SUGGESTION = "This reads as a direction question: `picket:consulting` handles it, not a lane";
export const DIRECTION_PHRASES = ["should we", "which approach", "build or buy", "trade-off between", "stress-test", "question me", "interview me", "challenge my thinking"];

const USER_SOURCE = "user";
const MAX_REPLY_WORDS = 3;
const REJECT_REPLY = /^(?:x\s|reject:)/i;
const NAMES_SKILL = /picket:/i;
const DIRECTION = new RegExp(`\\b(?:${DIRECTION_PHRASES.join("|")})\\b`, "i");

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isLeadReply(text: string): boolean {
  return wordCount(text) <= MAX_REPLY_WORDS || REJECT_REPLY.test(text) || NAMES_SKILL.test(text);
}

export function consultingHint(prompt: string, source: string | undefined): string | null {
  if (source !== undefined && source !== USER_SOURCE) return null;
  const text = prompt.trim();
  if (isLeadReply(text)) return null;
  return DIRECTION.test(text) ? SUGGESTION : null;
}

export const hook: HookSpec<"UserPromptSubmit"> = {
  handler: async (event) => {
    const hint = consultingHint(event.prompt ?? "", event.source);
    return hint ? context(event.hook_event_name, hint) : null;
  },
  onBadInput: "empty",
};
