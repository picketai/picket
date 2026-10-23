import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { gitAt } from "./git.mts";
import { withProject, writeConfig } from "./project.mts";

export type TempSource = { base: string; main: string; feat: string; source: { name: string; root: string } };

export function tempSource(t: TestContext): TempSource {
  const base = withProject(t, { picket: false });
  const main = join(base, "analysis");
  mkdirSync(join(main, "docs"), { recursive: true });
  gitAt(base)("init", "-q", "-b", "main", main);
  writeFileSync(join(main, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 10.\n");
  const git = gitAt(main);
  git("add", "-A");
  git("commit", "-q", "-m", "pricing");
  git("branch", "old");
  const feat = join(base, "analysis-feat");
  git("worktree", "add", "-q", "-b", "feat-x", feat);
  return { base, main, feat, source: { name: "analysis", root: main } };
}

export function tempProject(t: TestContext): string {
  const root = withProject(t, { host: true, picket: false });
  writeConfig(root, { sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } });
  gitAt(root)("init", "-q");
  return root;
}
