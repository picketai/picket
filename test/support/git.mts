import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";
import { withProject, type ProjectOptions } from "./project.mts";

export function gitIn(root: string, ...args: string[]): void {
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...args], { stdio: "ignore" });
}

export function gitAt(root: string): (...args: string[]) => string {
  return (...args) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function gitOut(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

export function writeIn(root: string, rel: string, text: string | Uint8Array): void {
  const path = join(root, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export function commitIn(root: string, text: string, message: string): void {
  writeIn(root, "a.txt", text);
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", message);
}

export type RepoOptions = ProjectOptions & { branch?: string; files?: Record<string, string>; message?: string };

export function gitRepo(t: TestContext, { branch = "main", files = { "a.txt": "one\n" }, message = "init", picket = false, ...project }: RepoOptions = {}): string {
  const root = withProject(t, { picket, ...project });
  gitIn(root, "init", "-q", "-b", branch);
  for (const [rel, text] of Object.entries(files)) writeIn(root, rel, text);
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", message);
  return root;
}
