import { posix, win32 } from "node:path";
import { HOST_DIR } from "../../shared/paths.mts";

export type ShadowProbe = {
  pathEnv: string;
  platform: NodeJS.Platform;
  home: string;
  configDir: string | null;
  realpath: (path: string) => string;
  isFile: (path: string) => boolean;
};

const NPX_SEGMENT = "_npx";
const REMOVE_GLOBAL = "npm uninstall -g @picketai/picket";

function pathsFor(platform: NodeJS.Platform) {
  return platform === "win32" ? win32 : posix;
}

function launcherName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "picket.cmd" : "picket";
}

function comparable(path: string, platform: NodeJS.Platform): string {
  const forward = path.replaceAll("\\", "/").replace(/\/$/, "");
  return platform === "win32" ? forward.toLowerCase() : forward;
}

function realOr(path: string, realpath: (path: string) => string): string {
  try {
    return realpath(path);
  } catch {
    return path;
  }
}

function isUnder(path: string, folder: string, platform: NodeJS.Platform): boolean {
  return comparable(path, platform).startsWith(`${comparable(folder, platform)}/`);
}

function hasNpxSegment(path: string): boolean {
  return path.split(/[\\/]/).includes(NPX_SEGMENT);
}

export function shadowingPicket({ pathEnv, platform, home, configDir, realpath, isFile }: ShadowProbe): string | null {
  const paths = pathsFor(platform);
  const plugins = paths.join(configDir ?? paths.join(home, HOST_DIR), "plugins");
  const pluginFolders = [plugins, realOr(plugins, realpath)];
  for (const folder of pathEnv.split(paths.delimiter).filter(Boolean)) {
    const candidate = paths.join(folder, launcherName(platform));
    if (!isFile(candidate)) continue;
    const real = realOr(candidate, realpath);
    if (hasNpxSegment(real) || pluginFolders.some((dir) => isUnder(real, dir, platform))) continue;
    return candidate;
  }
  return null;
}

export function shadowWarning(path: string): string {
  return `${path} is a picket from an earlier global install and runs before the plugin's; remove it with ${REMOVE_GLOBAL}`;
}
