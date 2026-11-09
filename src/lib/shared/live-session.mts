const WORKTREE_FOLDER = ".worktrees";

function normalized(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/+$/, "");
}

function isWorktreeBelow(segments: readonly string[]): boolean {
  if (segments.length < 2 || segments.some((segment) => segment === "" || segment === "..")) return false;
  return segments[segments.length - 2] === WORKTREE_FOLDER;
}

export function isProjectSession(cwd: unknown, root: string): boolean {
  if (typeof cwd !== "string") return false;
  const project = normalized(root);
  const folder = normalized(cwd);
  if (folder === project) return true;
  if (!folder.startsWith(`${project}/`)) return false;
  return isWorktreeBelow(folder.slice(project.length + 1).split("/"));
}
