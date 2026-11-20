import { closureTests, requestProse } from "#test/variants.mts";
import { signalsOf } from "./signals.mts";

const REVIEW_PROBES = [
  "Rename the verdict token constant, and store the token in a cookie after login.",
  "Log the verdict token. Then store the token in the cookie for login.",
  'Implement "the session token expires after 15 minutes" from the ticket in the login flow.',
  'Make the API match the spec: "every request carries a bearer token in the header".',
  'Implement "rotate the refresh token on every login" from the ticket.',
  'Fix "the login password check" in the form.',
  "Fix the bug in `password reset` flow.",
];

const CREDENTIAL_SENTENCES = [
  "Store the token in a cookie after login.",
  "The session token expires after 15 minutes.",
  "Every request carries a bearer token in the header.",
  "Rotate the refresh token on every login.",
  "Fix the login password check in the form.",
  "Hash the api key before saving it.",
  "Build the login form that keeps the session token in a cookie.",
  "Make src/lib/verbs/test/report.mts hash the api key before saving it.",
  "Create the password reset form named in SDR 00005, an irreversible action outside the repository.",
];

closureTests({
  guard: "admit security",
  grammar: requestProse("Rename the verdict token constant"),
  seeds: CREDENTIAL_SENTENCES,
  probes: REVIEW_PROBES,
  run: (text: string) => signalsOf(text, [], [], ["src/auth/"]),
  closed: (signals) => signals.security,
});
