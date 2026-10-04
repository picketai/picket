import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, ".claude");
const OUT = join(ROOT, "spike", "tether-full");
const COPIED = ["agents", "skills", "hooks", "lib", "bin", "scripts", "output-styles"];
const OLD_CLI = "node .claude/bin/harness.mjs";
const NEW_CLI = 'node "${CLAUDE_PLUGIN_ROOT}/bin/harness.mjs"';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, ".claude-plugin"), { recursive: true });
for (const dir of COPIED) if (existsSync(join(SRC, dir))) cpSync(join(SRC, dir), join(OUT, dir), { recursive: true });

let rewritten = 0;
for (const file of walk(OUT).filter((f) => f.endsWith(".md"))) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(OLD_CLI)) continue;
  writeFileSync(file, text.replaceAll(OLD_CLI, NEW_CLI));
  rewritten++;
}

const settings = JSON.parse(readFileSync(join(SRC, "settings.json"), "utf8"));
const hooks = JSON.parse(JSON.stringify(settings.hooks).replaceAll("${CLAUDE_PROJECT_DIR}/.claude/hooks/", "${CLAUDE_PLUGIN_ROOT}/hooks/"));
mkdirSync(join(OUT, "hooks"), { recursive: true });
writeFileSync(join(OUT, "hooks", "hooks.json"), JSON.stringify({ hooks }, null, 2));
writeFileSync(join(OUT, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "tether", version: "0.0.1-spike-full" }, null, 2));
console.log(`built ${OUT}: ${walk(OUT).length} files, ${rewritten} markdown files rewritten`);
