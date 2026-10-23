import type { Work } from "status-contract";
import type { LatestView } from "picket-views";

type OpenLatest = Exclude<LatestView, { id: null }>;
type Holds<T extends true> = T;

export type WorkKeysAreLatestKeys = Holds<[Exclude<keyof Work, keyof OpenLatest>] extends [never] ? true : false>;
export type LatestFitsWork = Holds<Pick<OpenLatest, keyof Work & keyof OpenLatest> extends Work ? true : false>;
