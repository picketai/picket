import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TESTER_KIND = "tester";

const TASKS = join(dirname(fileURLToPath(import.meta.url)), "..", "tasks");

function readTasks() {
  return readdirSync(TASKS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(TASKS, f), "utf8")))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function selects(word, task) {
  if (word.startsWith("lane:")) return task.kind === undefined && task.lane === word.slice("lane:".length);
  if (word.startsWith("kind:")) return task.kind === word.slice("kind:".length);
  return task.id === word;
}

export function loadTasks(filter) {
  const all = readTasks();
  if (filter === "all") return all.filter((task) => task.kind === undefined);
  const wanted = filter.split(",").map((s) => s.trim());
  return all.filter((task) => wanted.some((word) => selects(word, task)));
}

export function testerRefusal(tasks, pluginDir) {
  if (pluginDir) return null;
  const tester = tasks.find((task) => task.kind === TESTER_KIND);
  return tester ? `tester task ${tester.id} needs a harness with a plugin directory; use --harness plugin` : null;
}
