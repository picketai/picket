import { closureTests, JSON_SECRET_VALUE, jsonBodies, jsonSecretSeeds } from "#test/variants.mts";
import { maskedBody } from "./drive-log.mts";

closureTests({
  guard: "maskedBody",
  grammar: jsonBodies,
  seeds: jsonSecretSeeds,
  run: (body: string) => maskedBody(body),
  closed: (output) => !output.includes(JSON_SECRET_VALUE),
});
