import type { TestContext } from "node:test";
import { decision } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, commandLines, loadGuard, tableRows } from "#test/variants.mts";

const GIT_SAMPLES: Record<string, string> = {
  push: "git push origin trunk",
  reset: "git reset --hard",
  rebase: "git rebase trunk",
  checkout: "git checkout trunk",
  merge: "git merge x",
  clean: "git clean -fd",
  branch: "git branch -D x",
};

const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm"];

const projects = new WeakMap<TestContext, string>();

function projectOf(t: TestContext): string {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  projects.set(t, root);
  return root;
}

const rules = await loadGuard(() => import("./rules.mts"), "src/lib/hooks/guard/bash/rules.mts");
const sameName = (name: string) => name;

closureTests({
  guard: "guard.bash destructive roots",
  grammar: commandLines,
  seeds: ["git config user.name x", "git -C sub push"],
  rows: [
    { table: tableRows(rules, "DENIED_NAMES"), key: sameName, seedsOf: (name: string) => [name === "rm" ? "rm -rf build" : `${name} build`] },
    { table: tableRows(rules, "DENY_GIT_SUBCOMMANDS"), key: sameName, seedsOf: (sub: string) => (Object.hasOwn(GIT_SAMPLES, sub) ? [GIT_SAMPLES[sub]] : []) },
    { table: tableRows(rules, "NPM_DENY_SUBCOMMANDS"), key: sameName, seedsOf: (sub: string) => PACKAGE_MANAGERS.map((manager) => `${manager} ${sub}`) },
  ],
  run: (command: string, t) => decision(command, { root: projectOf(t), tool: "Bash" }),
  closed: (decided) => decided === "deny",
});
