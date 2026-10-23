import { test } from "node:test";
import assert from "node:assert/strict";
import { extractReferences } from "./references.mts";

const references = (text: string) => extractReferences(text).refs;

test("tokens strip punctuation and line suffixes, read pins, refuse dot segments, and cap at 200", () => {
  assert.deepEqual(references("(docs/a.md:12), `b.md`, c.md, analysis@feat-x:docs/c.md ../etc/passwd"), [
    { ref: "docs/a.md", source: null, path: "docs/a.md", anchor: null, pin: null },
    { ref: "b.md", source: null, path: "b.md", anchor: null, pin: null },
    { ref: "analysis@feat-x:docs/c.md", source: "analysis", path: "docs/c.md", anchor: null, pin: "feat-x" },
  ]);
  assert.equal(references(Array.from({ length: 300 }, (_, i) => `d/f${i}.md`).join(" ")).length, 200);
});

test("a #fragment and a markdown link target resolve their path", () => {
  assert.deepEqual(references("See [late fees](./docs/orders/late%2Dfees.md), docs/orders/fees.md#late-fees and docs/orders/fees.md?v=2."), [
    { ref: "docs/orders/late-fees.md", source: null, path: "docs/orders/late-fees.md", anchor: null, pin: null },
    { ref: "docs/orders/fees.md", source: null, path: "docs/orders/fees.md", anchor: "late-fees", pin: null },
  ]);
});

test("a source name with a dot is not a pin: my.docs@main:a.md is plain text", () => {
  assert.deepEqual(extractReferences("Per `my.docs@main:a.md` the fee is waived."), { refs: [], unshaped: [] });
});
