import type { Outcome } from "../../src/lib/action.mjs";
import { workFile, workId } from "../../src/lib/work-files.mjs";
import type { Marker, WorkId } from "../../src/lib/work-files.mjs";

const root = "/r";
const id: WorkId = workId("20261022-x");

export function isApproved(marker: Marker): boolean { return marker === "aproved"; }
export const misspelledFile = workFile(root, id, "stat.yaml");
export const plainId = workFile(root, "20261022-x", "state.yaml");
export const wrongValue: Outcome<number> = { status: "done", value: "x" };
export class Point { constructor(readonly x: number) {} }
export const same = <T>(value: T) => value;
