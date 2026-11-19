export type ConnectionTarget = { server: string; database: string };
export type TargetRead = { target: ConnectionTarget } | { problem: string };

const MASK = "***";
const URL_FORM = /^[a-z][a-z0-9+.-]*:\/\//i;
const SERVER_KEYS = ["server", "data source", "address", "addr", "host"];
const DATABASE_KEYS = ["database", "initial catalog", "dbname"];
const PASSWORD_KEYS = ["password", "pwd"];
const NEITHER_FORM = "it is neither a URL (scheme://host/database) nor key=value pairs separated by ;";

type Pair = [key: string, value: string];

function filledParts(text: string): string[] {
  return text.split(";").filter((part) => part.trim() !== "");
}

function toPairs(parts: readonly string[]): Pair[] {
  return parts.flatMap((part): Pair[] => {
    const at = part.indexOf("=");
    return at < 0 ? [] : [[part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim()]];
  });
}

function strictPairs(text: string): Pair[] | null {
  const parts = filledParts(text);
  return parts.length === 0 || parts.some((part) => !part.includes("=")) ? null : toPairs(parts);
}

function firstOf(found: Map<string, string>, keys: readonly string[]): string | null {
  return keys.map((key) => found.get(key)).find((value): value is string => value !== undefined && value !== "") ?? null;
}

function parsedUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function decoded(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

function urlTarget(text: string): TargetRead {
  const url = parsedUrl(text);
  if (url === null) return { problem: NEITHER_FORM };
  if (url.host === "") return { problem: "it names no server" };
  const [segment] = url.pathname.split("/").filter(Boolean);
  const database = segment === undefined ? null : decoded(segment);
  if (database === null || database === "") return { problem: "it names no database" };
  return { target: { server: url.host, database } };
}

function singleValue(found: readonly Pair[], keys: readonly string[], what: string): { value: string } | { problem: string } {
  const values = found.filter(([key]) => keys.includes(key)).map(([, value]) => value);
  if (values.length > 1) return { problem: `it names the ${what} more than once (${keys.join(", ")})` };
  const [value] = values;
  return value === undefined || value === "" ? { problem: `it names no ${what}` } : { value };
}

function pairsTarget(text: string): TargetRead {
  const found = strictPairs(text);
  if (found === null) return { problem: NEITHER_FORM };
  const server = singleValue(found, SERVER_KEYS, "server");
  if ("problem" in server) return server;
  const database = singleValue(found, DATABASE_KEYS, "database");
  if ("problem" in database) return database;
  return { target: { server: server.value, database: database.value } };
}

export function readTarget(text: string): TargetRead {
  return URL_FORM.test(text) ? urlTarget(text) : pairsTarget(text);
}

function passwordOf(connection: string): string | null {
  const url = URL_FORM.test(connection) ? parsedUrl(connection) : null;
  if (url !== null) return url.password === "" ? null : decodeURIComponent(url.password);
  return firstOf(new Map(toPairs(filledParts(connection))), PASSWORD_KEYS);
}

export function maskConnection(text: string, connection: string): string {
  if (connection === "") return text;
  const whole = text.replaceAll(connection, MASK);
  const password = passwordOf(connection);
  return password === null ? whole : whole.replaceAll(password, MASK);
}
