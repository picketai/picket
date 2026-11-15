import { asWritten, closureTests, JSON_SECRET_VALUE, jsonKeySpellings, jsonPlaces, jsonSecretSeeds } from "#test/variants.mts";
import { maskedBody } from "./drive-log.mts";

closureTests({
  guard: "maskedBody",
  run: (body: string) => maskedBody(body),
  closed: (output) => !output.includes(JSON_SECRET_VALUE),
  checks: [
    { family: asWritten((body: string) => body), seeds: jsonSecretSeeds },
    { family: jsonPlaces, seeds: jsonSecretSeeds },
    { family: jsonKeySpellings, seeds: jsonSecretSeeds },
  ],
});
