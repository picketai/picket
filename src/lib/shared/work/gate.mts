import { securityPathOf } from "../security-paths.mts";
import { phasePaths, type ArtifactPhase, type PhaseEntry } from "./artifact.mts";

export type Gate = { kind: "security_path" | "security_mark" | "irreversible"; reason: string };

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
