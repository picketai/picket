const KERNEL_SCRIPT = /(?:^|\/)(?:harness|picket)\.mjs$/i;
const KERNEL_LAUNCHER = "picket";
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

export function normalizeRoot(token: string): string;
export function normalizeRoot(token: unknown): unknown;
export function normalizeRoot(token: unknown): unknown {
  if (typeof token !== "string") return token;
  const base = token.split(/[\\/]/).at(-1) ?? token;
  return base.replace(/\.exe$/i, "");
}

export function isAssignment(word: unknown): boolean {
  return typeof word === "string" && ENV_ASSIGNMENT.test(word);
}

export function kernelVerbStart(words: readonly unknown[]): number | null {
  let i = 0;
  while (isAssignment(words[i])) i++;
  if (normalizeRoot(words[i]) === KERNEL_LAUNCHER) return i + 1;
  if (normalizeRoot(words[i]) === "node" && KERNEL_SCRIPT.test(String(words[i + 1] ?? "").replace(/\\/g, "/"))) return i + 2;
  return null;
}
