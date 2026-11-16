import { basename } from "node:path";
import { parse as parseJsonc } from "../../util/vendor/jsonc-parser.mjs";

export type ConfigFormat = "json" | "xml" | "dotenv" | "properties" | "unread";
export type ConfigEntry = { file: string; format: ConfigFormat; key: string | null; value: string | null; address: boolean };

type Pair = { key: string; value: string };

const MASK = "***";
const CONFIG_NAME = /(?:appsettings|settings|config|configuration|application)/i;
const SECRET_WORDS = ["password", "passwd", "pwd", "secret", "token", "apikey", "credential", "privatekey", "sas", "signature", "sig", "code", "accountkey", "sharedaccesskey"];
const ORDINARY_CODE_NAMES = ["countrycode", "postalcode", "postcode", "zipcode", "statuscode", "errorcode", "currencycode", "languagecode", "regioncode", "exitcode"];
const NAME_SEPARATORS = /[\s_.-]+/g;
const ADDRESS_KEY_ENDINGS = ["url", "uri", "endpoint", "host", "address", "connectionstring", "dsn"];
const ADDRESS_PAIR_NAMES = "server|data source|host|hostname|address|addr|network address|endpoint|accountendpoint|contact points";

const URL_SCHEME = /[a-z][a-z0-9+.-]*:\/\//i;
const JDBC = /^jdbc:[a-z0-9]+:/i;
const HOST_PORT = /^[^\s:/]*[a-z][^\s:/]*:\d{1,5}$/i;
const ADDRESS_PAIR = new RegExp(`(?:^|[;( ])\\s*(?:${ADDRESS_PAIR_NAMES})\\s*=\\s*[^;)\\s]`, "i");
const PAIR_NAME = /(?:^|[;( ?&])\s*([^=;()?&\s][^=;()?&]*?)\s*=\s*/g;
const SECRET_VALUE_END = /[;)]/;
const URL_PASSWORD = /([a-z][a-z0-9+.-]*:\/\/[^:/@\s]+:)([^@\s/]*)(@)/gi;
const XML_ADD = /<add\b([^>]*?)\/?>/gi;
const XML_ATTRIBUTE = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
const KEY_SEPARATORS = /[:.]|__/;

export function configFormat(fileName: string): ConfigFormat | null {
  const name = fileName.toLowerCase();
  if (name === ".env" || name.startsWith(".env.")) return "dotenv";
  if (name.endsWith(".properties")) return "properties";
  if (name.endsWith(".config")) return "xml";
  if (name.endsWith(".json")) return CONFIG_NAME.test(name) ? "json" : null;
  if (/\.(?:ya?ml|toml|ini)$/.test(name)) return CONFIG_NAME.test(name) ? "unread" : null;
  return null;
}

function lastSegment(key: string): string {
  return (key.split(KEY_SEPARATORS).at(-1) ?? key).toLowerCase();
}

function jsonPairs(value: unknown, prefix: string): Pair[] {
  if (typeof value === "string") return prefix === "" ? [] : [{ key: prefix, value }];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => jsonPairs(child, prefix === "" ? key : `${prefix}:${key}`));
}

function xmlPairs(text: string): Pair[] {
  return [...text.matchAll(XML_ADD)].flatMap(([, attributes]) => {
    const fields = Object.fromEntries([...attributes.matchAll(XML_ATTRIBUTE)].map(([, name, value]) => [name.toLowerCase(), value]));
    const key = fields.key ?? fields.name;
    const value = fields.value ?? fields.connectionstring;
    return key !== undefined && value !== undefined ? [{ key, value }] : [];
  });
}

function unquoted(value: string): string {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

function linePairs(text: string, separator: RegExp, comment: RegExp): Pair[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (trimmed === "" || comment.test(trimmed)) return [];
    const match = trimmed.match(separator);
    if (!match || match.index === undefined) return [];
    const key = trimmed.slice(0, match.index).replace(/^export\s+/, "").trim();
    return key === "" ? [] : [{ key, value: unquoted(trimmed.slice(match.index + match[0].length)) }];
  });
}

function pairsOf(format: ConfigFormat, text: string): Pair[] {
  if (format === "json") return jsonPairs(parseJsonc(text), "");
  if (format === "xml") return xmlPairs(text);
  if (format === "dotenv") return linePairs(text, /=/, /^#/);
  if (format === "properties") return linePairs(text, /\s*[=:]\s*/, /^[#!]/);
  return [];
}

export function readConfigFile(path: string, text: string): ConfigEntry[] {
  const format = configFormat(basename(path));
  if (format === null) return [];
  if (format === "unread") return [{ file: path, format, key: null, value: null, address: false }];
  return pairsOf(format, text).map(({ key, value }) => ({ file: path, format, key, value, address: isAddressLike(key, value) }));
}

export function isAddressLike(key: string | null, value: string | null): boolean {
  if (value === null || value.trim() === "") return false;
  const text = value.trim();
  if (URL_SCHEME.test(text) || JDBC.test(text) || HOST_PORT.test(text) || ADDRESS_PAIR.test(text)) return true;
  return key !== null && ADDRESS_KEY_ENDINGS.some((ending) => lastSegment(key).endsWith(ending));
}

function plainName(name: string): string {
  const joined = name.toLowerCase().replace(NAME_SEPARATORS, "");
  return ORDINARY_CODE_NAMES.reduce((plain, ordinary) => plain.replaceAll(ordinary, ""), joined);
}

export function isSecretName(name: string): boolean {
  const plain = plainName(name);
  return SECRET_WORDS.some((word) => plain.includes(word));
}

export type SecretLeafMapper = (leaf: string | number, key: string) => unknown;

function mapUnder(value: unknown, secretKey: string | null, onLeaf: SecretLeafMapper): unknown {
  if (secretKey !== null && (typeof value === "string" || typeof value === "number")) return onLeaf(value, secretKey);
  if (Array.isArray(value)) return value.map((child) => mapUnder(child, secretKey, onLeaf));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, mapUnder(child, isSecretName(key) ? key : secretKey, onLeaf)]));
}

export function mapSecretLeaves(value: unknown, onLeaf: SecretLeafMapper): unknown {
  return mapUnder(value, null, onLeaf);
}

function maskedPairs(text: string): string {
  let out = "";
  let copied = 0;
  for (const match of text.matchAll(PAIR_NAME)) {
    const valueStart = (match.index ?? 0) + match[0].length;
    if (valueStart < copied || !isSecretName(match[1])) continue;
    const end = text.slice(valueStart).search(SECRET_VALUE_END);
    const valueEnd = end < 0 ? text.length : valueStart + end;
    out += `${text.slice(copied, valueStart)}${MASK}`;
    copied = valueEnd;
  }
  return out + text.slice(copied);
}

export function masked(key: string | null, value: string | null): string | null {
  if (value === null) return null;
  if (key !== null && isSecretName(lastSegment(key))) return MASK;
  return maskedPairs(value).replace(URL_PASSWORD, `$1${MASK}$3`);
}
