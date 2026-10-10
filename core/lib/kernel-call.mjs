const KERNEL_SCRIPT = /(?:^|\/)(?:harness|picket)\.mjs$/i;
const KERNEL_LAUNCHERS = ["picket"];
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

export function normalizeRoot(token) {
  if (typeof token !== "string") return token;
  const base = token.split(/[\\/]/).pop();
  return base.replace(/\.exe$/i, "");
}

export function kernelVerbStart(words) {
  let i = 0;
  while (typeof words[i] === "string" && ENV_ASSIGNMENT.test(words[i])) i++;
  if (KERNEL_LAUNCHERS.includes(normalizeRoot(words[i]))) return i + 1;
  if (normalizeRoot(words[i]) === "node" && KERNEL_SCRIPT.test(String(words[i + 1] ?? "").replace(/\\/g, "/"))) return i + 2;
  return null;
}
