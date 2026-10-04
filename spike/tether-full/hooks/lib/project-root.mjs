// Project-root resolution for hooks that police or read repo-relative paths.
//
// Why this exists: hooks used to anchor paths to the SESSION CWD (`data.cwd`),
// which is only the project root by coincidence. This repo is an umbrella with
// nested git repos and a populated `.worktrees/`, so sessions routinely start in
// a subdirectory — and every cwd-anchored path check then misbehaves:
//
//   - guard.write.mjs computed rel = "../../artifacts/scope-changes/x.md" and
//     took the leading ".." to mean "outside the project — not ours to police",
//     so the ownership guard FAILED OPEN for anything reached from a subdirectory.
//     (Found live in the development umbrella: artifacts/scope-changes/ and two
//     loose files at artifacts/ root, all of which today's rules forbid.)
//   - inject.*.mjs looked for .claude/<file> under the subdirectory and silently
//     injected nothing.
//
// Anchoring to the project root makes a path resolve identically no matter where
// the session started, which is the whole point of a deterministic guard.
import { existsSync } from "node:fs";
import { join, relative, isAbsolute, resolve, dirname } from "node:path";

// `.claude/` is the marker, not `.git/`: in an umbrella repo the sub-repos have
// their own .git but only the umbrella carries the harness. A git worktree that
// checks out .claude/ is correctly treated as its own root.
export function projectRoot(data) {
  const env = process.env.CLAUDE_PROJECT_DIR;
  if (env) return env; // harness-provided and authoritative

  let dir = data?.cwd ?? process.cwd();
  for (let i = 0; i < 64; i++) {
    if (existsSync(join(dir, ".claude"))) return dir;
    const up = dirname(dir);
    if (up === dir) break; // filesystem root
    dir = up;
  }
  return data?.cwd ?? process.cwd(); // no marker found — behave as before
}

// Resolve a tool-supplied path to one that is relative to the project root.
// Relative inputs stay cwd-relative (that is what the tool meant); the result is
// then expressed from the root so the policy rules can key on it.
//
// `outside` is true only when the target genuinely falls outside the project —
// a different drive, an ancestor of the root, or the root itself. Callers treat
// that as "not ours to police" and exit 0.
export function repoRelative(data, filePath) {
  const root = projectRoot(data);
  const base = data?.cwd ?? root;
  const abs = isAbsolute(filePath) ? filePath : resolve(base, filePath);

  let rel = relative(root, abs);
  // Defensive: on Windows a drive-letter case mismatch can make `relative`
  // return an absolute path even for a path inside the root.
  if (isAbsolute(rel) && process.platform === "win32") {
    const a = abs.replaceAll("\\", "/").toLowerCase();
    const r = root.replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
    if (a.startsWith(r + "/")) rel = abs.slice(root.length).replace(/^[\\/]/, "");
  }
  rel = rel.replaceAll("\\", "/").replace(/^\.\//, "");

  const outside = rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel);
  return { root, abs, rel, outside };
}
