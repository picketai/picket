import type { Summary } from "./review-summary.mts";

export type ChecklistScope = "phase" | "checkpoint" | "cumulative" | "crosscheck";
export type Checklist = { path: string; skip?: string[] };
export type ChecklistInput = Pick<Summary, "size" | "frameworks" | "concerns" | "security_path" | "extension_steps">;

export const CHECKLIST_SCOPES: readonly ChecklistScope[] = ["phase", "checkpoint", "cumulative", "crosscheck"];
export const CHECKLIST_ROOT = "${CLAUDE_PLUGIN_ROOT}/skills/reviewing/checklists/";

const ALIGNMENT = "10-alignment.md";
const BAR = "12-bar.md";
const TRACED = "15-traced.md";
const PATTERNS_CORE = "20-patterns-core.md";
const RED_FLAGS = "25-design-red-flags.md";
const SECURITY = "30-patterns-security.md";
const CROSSCHECK = "60-crosscheck.md";
const MEDIUM_SKIP = ["SOLID", "DRY"];

const FRAMEWORK_FILES: Readonly<Record<string, string>> = { typescript: "40-framework-typescript.md", dotnet: "40-framework-dotnet.md" };
const CONCERN_FILES: Readonly<Record<string, string>> = { "clean-architecture": "50-concern-clean-architecture.md", "vertical-slice": "50-concern-vertical-slice.md" };

export const MAPPED_CHECKLISTS: readonly string[] = [ALIGNMENT, BAR, TRACED, PATTERNS_CORE, RED_FLAGS, SECURITY, CROSSCHECK, ...Object.values(FRAMEWORK_FILES), ...Object.values(CONCERN_FILES)];

function core(name: string, skip?: string[]): Checklist {
  return skip ? { path: CHECKLIST_ROOT + name, skip } : { path: CHECKLIST_ROOT + name };
}

function mapped(names: readonly string[], files: Readonly<Record<string, string>>): Checklist[] {
  return names.filter((name) => Object.hasOwn(files, name)).map((name) => core(files[name]));
}

function patternsCore({ size, security_path }: ChecklistInput): Checklist[] {
  if (security_path || size === "large") return [core(PATTERNS_CORE)];
  return size === "medium" ? [core(PATTERNS_CORE, MEDIUM_SKIP)] : [];
}

export function isChecklistScope(value: string): value is ChecklistScope {
  return (CHECKLIST_SCOPES as readonly string[]).includes(value);
}

export function reviewChecklists(input: ChecklistInput, scope: ChecklistScope): Checklist[] {
  if (scope === "crosscheck") return [core(CROSSCHECK)];
  const wide = input.size !== "small";
  return [
    core(ALIGNMENT),
    core(BAR),
    ...(scope === "cumulative" ? [core(TRACED)] : []),
    ...patternsCore(input),
    ...(wide ? [core(RED_FLAGS)] : []),
    core(SECURITY),
    ...mapped(input.frameworks, FRAMEWORK_FILES),
    ...(wide ? mapped(input.concerns, CONCERN_FILES) : []),
    ...input.extension_steps.map((step) => ({ path: step.path })),
  ];
}
