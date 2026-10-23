import { test } from "node:test";
import assert from "node:assert/strict";
import { displayWidth } from "./text-width.mts";

test("displayWidth counts wide, emoji and zero-width code points by display column", () => {
  assert.equal(displayWidth("数据"), 4);
  assert.equal(displayWidth("⎇ ◷"), 3);
  assert.equal(displayWidth("\u{F0450}\u{E0B6}"), 2);
  assert.equal(displayWidth("é"), 1);
  assert.equal(displayWidth("\u{1F44D}"), 2);
  assert.equal(displayWidth("a‍b️"), 2);
});
