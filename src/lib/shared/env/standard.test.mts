import { test } from "node:test";
import assert from "node:assert/strict";
import { workId } from "../work/files.mts";
import { instanceTag } from "../work/send.mts";
import { imageName, itemKey, stackName, urlVariable } from "./standard.mts";

const ID = workId("20261114-orders-export");

test("an item with a ticket source is keyed by the lowercase ticket (T-2.4)", () => {
  const key = itemKey({ id: ID, source: "PROJ-481" });
  assert.equal(key, "proj-481");
  assert.equal(stackName(key), "picket-proj-481");
  assert.equal(imageName("orders", key, "4f2a91c"), "picket/orders-proj-481:4f2a91c");
});

test("an item without a ticket is keyed by its instance tag (T-2.4)", () => {
  assert.equal(itemKey({ id: ID }), instanceTag(ID));
  assert.equal(itemKey({ id: ID, source: "https://example.com/story" }), instanceTag(ID));
});

test("image names are lowercase and address variables are upper snake case (T-2.4)", () => {
  assert.equal(imageName("Orders", "proj-481", "4F2A91C-tAB12CD3"), "picket/orders-proj-481:4f2a91c-tab12cd3");
  assert.equal(urlVariable("payments-mock"), "PICKET_URL_PAYMENTS_MOCK");
  assert.equal(urlVariable("api.gateway"), "PICKET_URL_API_GATEWAY");
});
