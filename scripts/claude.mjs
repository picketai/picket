import { spawn } from "node:child_process";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function pathKey(env) {
  if ("PATH" in env) return "PATH";
  return Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
}

export function checkoutEnv(env, repo) {
  const key = pathKey(env);
  const bin = join(repo, "dist", "bin");
  const others = String(env[key] ?? "")
    .split(delimiter)
    .filter((entry) => entry && resolve(entry) !== resolve(bin));
  return { ...env, [key]: [bin, ...others].join(delimiter), PICKET_CHECKOUT: repo };
}

function launch(args) {
  const child = spawn("claude", ["--plugin-dir", "dist", ...args], {
    cwd: REPO,
    env: checkoutEnv(process.env, REPO),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("error", (err) => {
    console.error(`npm run claude: ${err.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) launch(process.argv.slice(2));
