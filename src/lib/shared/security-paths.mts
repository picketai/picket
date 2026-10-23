const GLOB_TAIL = /\/\*\*?$/;

function normalise(path: string): string {
  return path.replaceAll("\\", "/").replace(/^(\.\/)+/, "");
}

function asPrefix(entry: string): string {
  const path = normalise(entry).replace(GLOB_TAIL, "");
  return path.endsWith("/") ? path : `${path}/`;
}

function isFolderName(prefix: string): boolean {
  return prefix.indexOf("/") === prefix.length - 1;
}

export function securityPathOf(path: string, configured: readonly string[]): string | null {
  const file = normalise(path);
  return configured.find((entry) => {
    const prefix = asPrefix(entry);
    return isFolderName(prefix) ? `/${file}`.includes(`/${prefix}`) : file.startsWith(prefix);
  }) ?? null;
}
