import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";
import { withProject } from "./project.mts";

export function gitIn(root: string, ...args: string[]): void {
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { stdio: "ignore" });
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

export function gitRepo(t: TestContext): string {
  const root = withProject(t, { picket: false });
  gitIn(root, "init", "-q", "-b", "main");
  commitIn(root, "one\n", "init");
  return root;
}
