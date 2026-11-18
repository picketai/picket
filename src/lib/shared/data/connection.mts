export type ConnectionTarget = { server: string; database: string };

const UNKNOWN = "unknown";
const MASK = "***";
const URL_FORM = /^[a-z][a-z0-9+.-]*:\/\//i;
const SERVER_KEYS = ["server", "data source", "address", "addr", "host"];
const DATABASE_KEYS = ["database", "initial catalog", "dbname"];
const PASSWORD_KEYS = ["password", "pwd"];

function pairs(text: string): Map<string, string> {
  const entries = text.split(";").flatMap((part): [string, string][] => {
    const at = part.indexOf("=");
    return at < 0 ? [] : [[part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim()]];
  });
  return new Map(entries);
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

function urlTarget(url: URL): ConnectionTarget {
  const [database] = url.pathname.split("/").filter(Boolean);
  return { server: url.host || UNKNOWN, database: database === undefined ? UNKNOWN : decodeURIComponent(database) };
}

export function connectionTarget(text: string): ConnectionTarget {
  const url = URL_FORM.test(text) ? parsedUrl(text) : null;
  if (url !== null) return urlTarget(url);
  const found = pairs(text);
  return { server: firstOf(found, SERVER_KEYS) ?? UNKNOWN, database: firstOf(found, DATABASE_KEYS) ?? UNKNOWN };
}

function passwordOf(connection: string): string | null {
  const url = URL_FORM.test(connection) ? parsedUrl(connection) : null;
  if (url !== null) return url.password === "" ? null : decodeURIComponent(url.password);
  return firstOf(pairs(connection), PASSWORD_KEYS);
}

export function maskConnection(text: string, connection: string): string {
  if (connection === "") return text;
  const whole = text.replaceAll(connection, MASK);
  const password = passwordOf(connection);
  return password === null ? whole : whole.replaceAll(password, MASK);
}
