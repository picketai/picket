export type PlistValue = string | number | { data: string };

const HEADER = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0">',
];

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function valueXml(value: PlistValue): string {
  if (typeof value === "string") return `<string>${escapeXml(value)}</string>`;
  if (typeof value === "number") return Number.isInteger(value) ? `<integer>${value}</integer>` : `<real>${value}</real>`;
  if (value && typeof value.data === "string") return `<data>${value.data}</data>`;
  throw new Error(`plist value of type ${typeof value} is not supported`);
}

export function xmlPlist(dict: Record<string, PlistValue>): string {
  const entries = Object.entries(dict).flatMap(([key, value]) => [`\t<key>${escapeXml(key)}</key>`, `\t${valueXml(value)}`]);
  return [...HEADER, "<dict>", ...entries, "</dict>", "</plist>", ""].join("\n");
}
