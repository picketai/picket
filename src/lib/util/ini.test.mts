import { test } from "node:test";
import assert from "node:assert/strict";
import { getKey, removeKey, renderIni, setKey } from "./ini.mts";

const CRLF_RC = "[General]\r\nFoo=1\r\n\r\n[Desktop Entry]\r\nDefaultProfile=Old.profile\r\n";

test("setKey replaces a key and adds a missing one while keeping CRLF line ends", () => {
  const replaced = setKey(CRLF_RC, "Desktop Entry", "DefaultProfile", "PicketAI.profile");
  assert.equal(replaced, "[General]\r\nFoo=1\r\n\r\n[Desktop Entry]\r\nDefaultProfile=PicketAI.profile\r\n");
  const added = setKey(CRLF_RC, "General", "Bar", "2");
  assert.equal(added, "[General]\r\nFoo=1\r\nBar=2\r\n\r\n[Desktop Entry]\r\nDefaultProfile=Old.profile\r\n");
  assert.equal(setKey("[General]\r\nFoo=1", "New", "Key", "v"), "[General]\r\nFoo=1\r\n\r\n[New]\r\nKey=v\r\n");
});

test("removeKey drops only the key's line and keeps CRLF line ends", () => {
  assert.equal(removeKey(CRLF_RC, "Desktop Entry", "DefaultProfile"), "[General]\r\nFoo=1\r\n\r\n[Desktop Entry]\r\n");
  assert.equal(removeKey(CRLF_RC, "General", "Missing"), CRLF_RC);
});

test("getKey reads a key from its own section only", () => {
  const text = "[A]\nName=first\n\n[B]\nName=second\n";
  assert.equal(getKey(text, "B", "Name"), "second");
  assert.equal(getKey(text, "A", "Name"), "first");
  assert.equal(getKey(text, "C", "Name"), undefined);
  assert.equal(getKey(CRLF_RC, "Desktop Entry", "DefaultProfile"), "Old.profile");
});

test("renderIni writes sections with a blank line between them and a final newline", () => {
  assert.equal(renderIni([["A", [["x", "1"]]], ["B", [["y", "2"], ["z", "3"]]]]), "[A]\nx=1\n\n[B]\ny=2\nz=3\n");
});
