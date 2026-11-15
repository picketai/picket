import { asWritten, closureTests, type Family, type Spelling } from "#test/variants.mts";
import { maskedBody } from "./drive-log.mts";

const SECRET_VALUE = "Kval9";
const SECRET_WORDS = ["password", "pwd", "secret", "token", "api_key", "apikey", "signature", "credential", "accountkey", "sharedaccesskey"];
const SEEDS = SECRET_WORDS.map((word) => JSON.stringify({ [word]: SECRET_VALUE }));

function spelled(inputs: string[]): Spelling<string>[] {
  return inputs.map((input) => ({ label: input, input }));
}

function onlyPair(seed: string): [string, unknown] {
  const [pair] = Object.entries(JSON.parse(seed) as Record<string, unknown>);
  return pair;
}

const jsonPlaces: Family<string> = {
  name: "JSON places",
  spell: (seed) => {
    const [key, value] = onlyPair(seed);
    const pair = { [key]: value };
    return spelled([
      JSON.stringify({ sku: "PKT-a", ...pair }),
      JSON.stringify({ order: { customer: pair } }),
      JSON.stringify([{ sku: "PKT-a" }, pair]),
      JSON.stringify({ items: [{ auth: pair }] }),
      JSON.stringify({ sku: "PKT-a", ...pair }, null, 2),
    ]);
  },
};

const keySpellings: Family<string> = {
  name: "key spellings",
  spell: (seed) => {
    const [key, value] = onlyPair(seed);
    const keys = [key.toUpperCase(), `${key[0].toUpperCase()}${key.slice(1)}`, `user_${key}`, `x-${key.replaceAll("_", "-")}`, `${key}Hash`];
    return spelled(keys.map((spelledKey) => JSON.stringify({ [spelledKey]: value })));
  },
};

closureTests({
  guard: "maskedBody",
  run: (body: string) => maskedBody(body),
  closed: (output) => !output.includes(SECRET_VALUE),
  checks: [
    { family: asWritten((body: string) => body), seeds: SEEDS },
    { family: jsonPlaces, seeds: SEEDS },
    { family: keySpellings, seeds: SEEDS },
  ],
});
