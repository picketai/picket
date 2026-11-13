import { securityPathOf } from "../security-paths.mts";
import { phasePaths, type ArtifactPhase, type PhaseEntry } from "./artifact.mts";
import type { CheckResult } from "./declared-checks.mts";

export type Gate = { kind: "security_path" | "security_mark" | "irreversible" | "declared_check"; reason: string };

function firstSecurityPath(paths: string[], securityPaths: readonly string[]): string | null {
  return paths.find((path) => securityPathOf(path, securityPaths) !== null) ?? null;
}

function isMarkedSecure(entry: PhaseEntry | null): boolean {
  return entry != null && Object.hasOwn(entry, "security") && entry.security !== false;
}

export function ownGate(phase: Pick<ArtifactPhase, "entry" | "touchSet" | "irreversible"> | undefined, securityPaths: readonly string[]): Gate | null {
  if (!phase) return null;
  const securePath = firstSecurityPath(phasePaths(phase), securityPaths);
  if (securePath) return { kind: "security_path", reason: `touches a security path (${securePath})` };
  if (isMarkedSecure(phase.entry)) return { kind: "security_mark", reason: "is marked security-sensitive in the record" };
  if (phase.irreversible) return { kind: "irreversible", reason: "carries an irreversible step" };
  return null;
}

export type RunChecks = { own: CheckResult[]; carried: CheckResult[]; endsRun: boolean; problems?: string[] };

export function checkGate({ own, carried, endsRun, problems = [] }: RunChecks): Gate | null {
  if (problems.length) return { kind: "declared_check", reason: "has a drive list the record cannot read" };
  const unheld = own.filter((result) => result.outcome === "failed" || result.outcome === "not_run").map((result) => result.check.covers);
  if (unheld.length) return { kind: "declared_check", reason: `has a declared check that did not hold (${[...new Set(unheld)].join(", ")})` };
  if (!endsRun) return null;
  const differences = carried.length + own.filter((result) => result.outcome === "prefix").length;
  if (!differences) return null;
  return { kind: "declared_check", reason: `ends the run with ${differences} carried check ${differences === 1 ? "difference" : "differences"}` };
}
