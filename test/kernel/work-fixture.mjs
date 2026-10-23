import { createWork as createWorkAt, newId as newIdAt, readState as readStateAt, writeState as writeStateAt } from "../../dist/lib/shared/work/state.mjs";
import { setMarker as setMarkerAt } from "../../dist/lib/shared/work/markers.mjs";
import { appendVerdict as appendVerdictAt } from "../../dist/lib/shared/work/verdict-log.mjs";
import { appendWaiver as appendWaiverAt } from "../../dist/lib/shared/work/approvals.mjs";
import { blockFiles as blockFilesAt, saveBlock as saveBlockAt } from "../../dist/lib/shared/work/block.mjs";

export function createWork({ root, now = new Date(), ...request }) {
  return createWorkAt(root, request, now);
}

export function readState(id, root) {
  return readStateAt(root, id);
}

export function writeState(state, root) {
  return writeStateAt(root, state, new Date());
}

export function setMarker(id, n, kind, root) {
  return setMarkerAt(root, id, n, kind, new Date());
}

export function appendVerdict(id, entry, root) {
  return appendVerdictAt(root, id, entry, new Date());
}

export function appendWaiver(id, entry, root) {
  return appendWaiverAt(root, id, entry, { cwd: process.cwd(), now: new Date() });
}

export function saveBlock(id, n, text, root) {
  return saveBlockAt(root, id, n, text);
}

export function blockFiles(id, n, root) {
  return blockFilesAt(root, id, n);
}

export function newId(title, now = new Date()) {
  return newIdAt(title, now);
}
