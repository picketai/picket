import type { Outcome } from "../../src/lib/shared/action.mts";
import { workFile, workId } from "../../src/lib/shared/work/files.mts";
import type { Marker, WorkId } from "../../src/lib/shared/work/files.mts";

const root = "/r";
const id: WorkId = workId("20261022-x");

export function isApproved(marker: Marker): boolean { return marker === "aproved"; }
export const misspelledFile = workFile(root, id, "stat.yaml");
export const plainId = workFile(root, "20261022-x", "state.yaml");
export const wrongValue: Outcome<number> = { status: "done", value: "x" };
export class Point { constructor(readonly x: number) {} }
export const same = <T>(value: T) => value;
