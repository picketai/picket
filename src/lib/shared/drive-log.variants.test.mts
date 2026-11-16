import { closureTests, JSON_SECRET_VALUE, jsonBodies, jsonSecretSeed, jsonSecretSeeds, loadGuard, tableRows } from "#test/variants.mts";
import { maskedBody } from "./drive-log.mts";

const configEntries = await loadGuard(() => import("./env/config-entries.mts"), "src/lib/shared/env/config-entries.mts");

closureTests({
  guard: "maskedBody",
  grammar: jsonBodies,
  seeds: jsonSecretSeeds,
  rows: [{ table: tableRows<string>(configEntries, "SECRET_WORDS"), key: (word) => word, seedsOf: (word) => [jsonSecretSeed(word)] }],
  run: (body: string) => maskedBody(body),
  closed: (output) => !output.includes(JSON_SECRET_VALUE),
});
