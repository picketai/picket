import { basename, resolve } from "node:path";
import { prettyModel } from "../../shared/format.mts";
import type { WorkingState } from "../../shared/git.mts";

type RateWindow = { used_percentage?: number; resets_at?: number };
type PromptCache = { caching_observed?: boolean; warm?: boolean; ttl?: string | null; expires_at?: number | null };

export type StatuslineInput = {
  session_id?: unknown;
  transcript_path?: string;
  cwd?: string;
  workspace?: { current_dir?: string; project_dir?: string };
  model?: { id?: string; display_name?: string };
  effort?: { level?: string };
  rate_limits?: { five_hour?: RateWindow; seven_day?: RateWindow };
  context_window?: { total_input_tokens?: number; context_window_size?: number; used_percentage?: number; current_usage?: { cache_read_input_tokens?: number } };
  prompt_cache?: PromptCache;
  cost?: { total_cost_usd?: number };
};

export type Limit = { percent: number; resetsAt: number | null };
export type CacheFacts = { observed: boolean; warm: boolean; ttl: string | null; expiresAt: number | null };

export type Facts = {
  folder: string | null;
  git: WorkingState | null;
  model: string | null;
  effort: string;
  skill: string | null;
  limits: { five_hour: Limit | null; seven_day: Limit | null };
  contextTokens: number;
  contextWindow: number | null;
  contextPercent: number;
  cacheRead: number | null;
  cache: CacheFacts | null;
  cost: number | null;
  now: number;
};

function secondsToMs(seconds: unknown): number | null {
  return typeof seconds === "number" ? seconds * 1000 : null;
}

function limitOf(window: RateWindow | undefined): Limit | null {
  if (!window) return null;
  return { percent: Math.round(window.used_percentage ?? 0), resetsAt: secondsToMs(window.resets_at) };
}

function cacheOf(promptCache: PromptCache | undefined): CacheFacts | null {
  if (!promptCache) return null;
  return {
    observed: promptCache.caching_observed === true,
    warm: promptCache.warm === true,
    ttl: promptCache.ttl ?? null,
    expiresAt: secondsToMs(promptCache.expires_at),
  };
}

function modelName(model: StatuslineInput["model"]): string | null {
  if (model?.display_name) return model.display_name;
  return model?.id ? prettyModel(model.id) : null;
}

export function workspaceDir(input: StatuslineInput): string | null {
  return input.workspace?.current_dir ?? input.cwd ?? null;
}

export function factsOf(input: StatuslineInput, { now, skill, git = null }: { now: number; skill: string | null; git?: WorkingState | null }): Facts {
  const context = input.context_window ?? {};
  const dir = workspaceDir(input);
  return {
    folder: dir === null ? null : basename(resolve(dir)),
    git,
    model: modelName(input.model),
    effort: input.effort?.level ?? "default",
    skill,
    limits: { five_hour: limitOf(input.rate_limits?.five_hour), seven_day: limitOf(input.rate_limits?.seven_day) },
    contextTokens: context.total_input_tokens ?? 0,
    contextWindow: context.context_window_size ?? null,
    contextPercent: Math.round(context.used_percentage ?? 0),
    cacheRead: context.current_usage?.cache_read_input_tokens ?? null,
    cache: cacheOf(input.prompt_cache),
    cost: input.cost?.total_cost_usd ?? null,
    now,
  };
}
