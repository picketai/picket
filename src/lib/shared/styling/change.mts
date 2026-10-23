import type { Host } from "./host.mts";
import type { Backup, ItemFields, ItemRemover, Manifest, ManifestItem } from "./manifest.mts";

export type ApplyContext = { backup: Backup; applied: readonly ManifestItem[] };

export type Change = {
  id: string;
  summary: string;
  question?: string;
  restart?: string | null;
  manual?: string;
  manualIfSkipped?: string;
  setsFont?: true;
  apply?: (host: Host, context: ApplyContext) => ItemFields | null | Promise<ItemFields | null>;
};

export type Component = ItemRemover & {
  plan: (host: Host, manifest: Manifest, earlier: readonly Change[]) => Change[];
};
