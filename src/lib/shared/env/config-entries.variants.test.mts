import { asWritten, closureTests, pairNames, pairPlaces } from "#test/variants.mts";
import { masked } from "./config-entries.mts";

const REVIEW_PROBES = [
  "https://pay.example.com/hook?apikey=abc123",
  "jdbc:mysql://h:3306/db?user=a&password=hunter2",
  "redis://h:6379?password=zzz",
  "SharedAccessSignature=sv=2020&sig=SECRETSIG",
  "https://a.example.com/x?api_key=K1",
  "https://a.example.com/x?access_token=K2",
  "https://a.example.com/x?client_secret=K3",
  "https://a.example.com/x?X-Amz-Signature=K4",
  "jdbc:postgresql://h/db?user=a&sslpassword=K5",
];

const FAMILY_VALUE = "Kval9";
const SECRET_WORDS = ["password", "pwd", "secret", "token", "api_key", "apikey", "signature", "sig", "credential", "accountkey", "sharedaccesskey"];
const SECRET_VALUES = ["abc123", "hunter2", "zzz", "SECRETSIG", "K1", "K2", "K3", "K4", "K5", FAMILY_VALUE];
const FAMILY_SEEDS = SECRET_WORDS.map((word) => `${word}=${FAMILY_VALUE}`);

closureTests({
  guard: "masked",
  run: (value: string) => masked("Url", value),
  closed: (output) => output !== null && !SECRET_VALUES.some((secret) => output.includes(secret)),
  checks: [
    { family: asWritten((value: string) => value), seeds: REVIEW_PROBES },
    { family: pairPlaces, seeds: FAMILY_SEEDS },
    { family: pairNames, seeds: FAMILY_SEEDS },
  ],
});
