import type { TestContext } from "node:test";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { userEntry, writeTranscript } from "#test/hook.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { closureTests, type Family, type Grammar } from "#test/variants.mts";
import { saveBlock } from "../../../shared/work/block.mts";
import { workId } from "../../../shared/work/files.mts";
import { setMarker } from "../../../shared/work/markers.mts";
import { blackboxDenial } from "./index.mts";

type ReadSeed = { tool: "Read" | "Grep"; rel: string };
type PathForm = "relative" | "absolute" | "dot" | "parent" | "symbolic link" | "upper-case on win32";
type ReadInput = ReadSeed & { form: PathForm };
type Project = { root: string; id: string; transcript: string };

const ITEM = "{item}";
const PLAN_PATH = "src/orders/api.mts";
const FIX_PATH = "src/orders/fix.mts";
const LINKED_SRC = "srclink";
const DESIGN = `---\nlane: design\nphases:\n  - n: 1\n    files: [${PLAN_PATH}]\n---\n# D\n\n## Phase 1: Orders\n`;
const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

const SEEDS: ReadSeed[] = [
  { tool: "Read", rel: PLAN_PATH },
  { tool: "Read", rel: FIX_PATH },
  { tool: "Read", rel: `work/${ITEM}/design.md` },
  { tool: "Read", rel: `work/${ITEM}/state.yaml` },
  { tool: "Grep", rel: PLAN_PATH },
  { tool: "Grep", rel: "src/orders" },
  { tool: "Grep", rel: "work" },
];

const SPELLED_FORMS: PathForm[] = ["absolute", "dot", "parent", "symbolic link", "upper-case on win32"];

function label({ tool, rel, form }: ReadInput): string {
  return `${tool} ${form} ${rel}`;
}

const readPathSpellings: Family<ReadSeed, ReadInput> = {
  name: "path spellings",
  spell: (seed) => SPELLED_FORMS.map((form) => ({ label: label({ ...seed, form }), input: { ...seed, form } })),
};

const readPaths: Grammar<ReadSeed, ReadInput> = {
  name: "read paths",
  written: (seed) => ({ ...seed, form: "relative" }),
  label,
  families: [readPathSpellings],
};

function project(t: TestContext): Project {
  const root = withProject(t, { host: true });
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", DESIGN);
  mkdirSync(join(root, "src", "orders"), { recursive: true });
  writeFileSync(join(root, PLAN_PATH), "x\n");
  writeFileSync(join(root, FIX_PATH), "z\n");
  setMarker(root, workId(id), 1, "approved", hookContext(root).now());
  saveBlock(root, workId(id), 1, `## Phase 1 of ${id}: Orders\n\nFiles: ${FIX_PATH}\n\nPHASE DONE\n`);
  symlinkSync(join(root, "src"), join(root, LINKED_SRC), LINK_TYPE);
  return { root, id, transcript: writeTranscript(root, [userEntry(`work: ${id}`)]) };
}

function spelledPath({ root }: Project, rel: string, form: PathForm): string {
  if (form === "relative") return rel;
  if (form === "absolute") return join(root, ...rel.split("/"));
  if (form === "dot") return `./${rel}`;
  if (form === "parent") return `docs/../${rel}`;
  if (form === "symbolic link") return join(root, rel.startsWith("src/") ? rel.replace("src/", `${LINKED_SRC}/`) : rel);
  return join(root, rel.toUpperCase());
}

function denied({ tool, rel, form }: ReadInput, t: TestContext): boolean {
  const made = project(t);
  const path = spelledPath(made, rel.replace(ITEM, made.id), form);
  const platform = form === "upper-case on win32" ? "win32" : process.platform;
  const tool_input = tool === "Read" ? { file_path: path } : { pattern: "x", path };
  const event = { hook_event_name: "PreToolUse" as const, tool_name: tool, tool_input, cwd: made.root, agent_type: "abcd-tester", transcript_path: made.transcript };
  return /black box/.test(blackboxDenial(event, { ...hookContext(made.root, { platform }), name: "guard.blackbox" }) ?? "");
}

closureTests({
  guard: "guard.blackbox",
  grammar: readPaths,
  seeds: SEEDS,
  run: denied,
  closed: (isDenied) => isDenied,
});
