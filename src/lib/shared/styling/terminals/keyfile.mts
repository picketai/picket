import { existsSync, readFileSync } from "node:fs";
import type { Change } from "../change.mts";
import { writeTracked, type ManifestItem, type Unapplied } from "../manifest.mts";

export type KeyfileSpec = { id: string; path: string; content: string; writer: string };

export function keyfileChange({ id, path, content, writer }: KeyfileSpec): Change[] {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) return [];
  return [
    {
      id,
      summary: `write ${path}`,
      ...(current === null ? {} : { question: `Replace ${path}?` }),
      restart: null,
      apply(host, { backup }) {
        return { ...writeTracked(path, content, backup), previous: {}, data: { writer, part: "file" } };
      },
    },
  ];
}

export function keptFile(item: ManifestItem): Unapplied {
  return { result: "kept", detail: "changed after setup", manual: `remove ${item.path} by hand if you no longer want it` };
}
