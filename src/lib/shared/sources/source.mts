export const SOURCE_NAME_CHARS = "[A-Za-z0-9_-]+";

export const SOURCE_NAME = new RegExp(`^${SOURCE_NAME_CHARS}$`);

export type Source = { name: string; env: string | null; root: string | null; reason: string | null };

export type ReachableSource = Source & { root: string };

export function isSourceName(name: string): boolean {
  return SOURCE_NAME.test(name);
}

export function isReachable(source: Source): source is ReachableSource {
  return source.root !== null;
}
