import { test } from "node:test";
import assert from "node:assert/strict";
import type { PullRequestMeta } from "./azdo.mts";
import { renderTickets, ticketKeys } from "./tickets.mts";

const meta = (fields: Partial<PullRequestMeta>): PullRequestMeta => ({ title: "", description: "", source_ref: null, target_ref: "refs/heads/main", author: null, status: null, ...fields });

test("ticketKeys finds one key in the description link, the branch and the title prefix, sources in that order", () => {
  const keys = ticketKeys(meta({ description: "See https://acme.atlassian.net/browse/SHOP-123", source_ref: "refs/heads/feature/SHOP-123-x", title: "SHOP-123: add basket" }));
  assert.deepEqual(keys, [{ key: "SHOP-123", from: ["description", "branch", "title"] }]);
});

test("ticketKeys ignores key-shaped bare text and returns nothing without meta", () => {
  assert.deepEqual(ticketKeys(meta({ description: "Fixes SHOP-124 and UTF-8", title: "Fix UTF-8 decoding", source_ref: "refs/heads/feature/utf-8-fix" })), []);
  assert.deepEqual(ticketKeys(null), []);
});

test("ticketKeys reads a bracketed title key and every description link in order", () => {
  assert.deepEqual(ticketKeys(meta({ title: "[SHOP-7] x" })), [{ key: "SHOP-7", from: ["title"] }]);
  const links = ticketKeys(meta({ description: "https://acme.atlassian.net/browse/SHOP-1 then https://acme.atlassian.net/browse/SHOP-2?focusedId=9" }));
  assert.deepEqual(links, [
    { key: "SHOP-1", from: ["description"] },
    { key: "SHOP-2", from: ["description"] },
  ]);
});

test("ticketKeys takes a branch key ended by a separator and not one running into more letters", () => {
  assert.deepEqual(ticketKeys(meta({ source_ref: "refs/heads/SHOP-9.fix" })), [{ key: "SHOP-9", from: ["branch"] }]);
  assert.deepEqual(ticketKeys(meta({ source_ref: "refs/heads/feature/SHOP-9x" })), []);
});

test("renderTickets names each key with its sources and path, or says none were found", () => {
  assert.equal(renderTickets([]), "tickets: none found");
  assert.equal(renderTickets([{ key: "SHOP-123", from: ["description", "branch"], path: ".picket/state/pr-412/SHOP-123.md" }]), "tickets: SHOP-123 (description, branch) → .picket/state/pr-412/SHOP-123.md");
});
