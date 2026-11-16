import type { TestContext } from "node:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { gitIn } from "#test/git.mts";
import { decision } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";
import { closureTests, SOURCE_PLACEHOLDER, sourceCommands } from "#test/variants.mts";

const SOURCE_ENV = "PICKET_TEST_SOURCE_ANALYSIS";

type SourceProject = { root: string; source: string };

const projects = new WeakMap<TestContext, SourceProject>();

function projectOf(t: TestContext): SourceProject {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  mkdirSync(join(source, "sub"));
  writeConfig(root, { version: 1, sources: { analysis: { env: SOURCE_ENV } } });
  const project = { root, source: source.replaceAll("\\", "/") };
  projects.set(t, project);
  return project;
}

closureTests({
  guard: "guard.bash sources",
  grammar: sourceCommands,
  seeds: [
    `touch ${SOURCE_PLACEHOLDER}/a`,
    `cp a ${SOURCE_PLACEHOLDER}/b`,
    `mkdir ${SOURCE_PLACEHOLDER}/d`,
    `sed -i s/a/b/ ${SOURCE_PLACEHOLDER}/a`,
    `echo x > ${SOURCE_PLACEHOLDER}/a`,
    `echo x | tee ${SOURCE_PLACEHOLDER}/a`,
    `git -C ${SOURCE_PLACEHOLDER} commit -m x`,
    `cd ${SOURCE_PLACEHOLDER} && touch a`,
  ],
  run: (command: string, t) => {
    const { root, source } = projectOf(t);
    return decision(command.replaceAll(SOURCE_PLACEHOLDER, source), { root, tool: "Bash", env: { [SOURCE_ENV]: source } });
  },
  closed: (decided) => decided === "deny",
});
