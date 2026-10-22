import { execFileSync } from "node:child_process";

export type GitReadOptions = { maxBuffer?: number };
export type GitRunOptions = { input?: string; env?: NodeJS.ProcessEnv };

type GitFailure = { stderr?: string | Buffer; message: string };

export function gitRead(root: string, args: string[], { maxBuffer }: GitReadOptions = {}): string | null {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer }).trimEnd();
  } catch {
    return null;
  }
}

function subcommand(args: string[]): string {
  return args.find((arg) => !arg.startsWith("-")) ?? "";
}

function lastStderrLine(err: GitFailure): string {
  const text = String(err.stderr ?? "").trim() || err.message.trim();
  return text.split("\n").at(-1) ?? "";
}

export function gitRun(root: string, args: string[], { input, env }: GitRunOptions = {}): string {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      input,
      env,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
  } catch (err) {
    throw new Error(`git ${subcommand(args)} failed: ${lastStderrLine(err as GitFailure)}`);
  }
}
