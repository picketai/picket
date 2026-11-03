import type { PullRequestMeta } from "./azdo.mts";

export type TicketSource = "description" | "branch" | "title";
export type TicketKey = { key: string; from: TicketSource[] };
export type Ticket = TicketKey & { path: string };

const KEY = "[A-Z][A-Z0-9_]+-\\d+";
const BROWSE_LINK = new RegExp(`/browse/(${KEY})(?![A-Za-z0-9_])`, "g");
const BRANCH_SEGMENT = new RegExp(`^(${KEY})(?=$|[-_/.])`);
const TITLE_PREFIX = new RegExp(`^\\s*\\[?(${KEY})(?=\\]|:|\\s|$)`);

function descriptionKeys(description: string): string[] {
  return [...description.matchAll(BROWSE_LINK)].map((m) => m[1]!);
}

function branchKeys(sourceRef: string | null): string[] {
  if (!sourceRef) return [];
  return sourceRef
    .replace(/^refs\/heads\//, "")
    .split("/")
    .flatMap((segment) => BRANCH_SEGMENT.exec(segment)?.[1] ?? []);
}

function titleKeys(title: string): string[] {
  const key = TITLE_PREFIX.exec(title)?.[1];
  return key ? [key] : [];
}

export function ticketKeys(meta: PullRequestMeta | null): TicketKey[] {
  if (!meta) return [];
  const found: [TicketSource, string[]][] = [
    ["description", descriptionKeys(meta.description)],
    ["branch", branchKeys(meta.source_ref)],
    ["title", titleKeys(meta.title)],
  ];
  const byKey = new Map<string, TicketSource[]>();
  for (const [source, keys] of found) {
    for (const key of keys) {
      const from = byKey.get(key) ?? [];
      if (!from.includes(source)) from.push(source);
      byKey.set(key, from);
    }
  }
  return [...byKey].map(([key, from]) => ({ key, from }));
}

export function renderTickets(tickets: Ticket[]): string {
  if (tickets.length === 0) return "tickets: none found";
  return `tickets: ${tickets.map((t) => `${t.key} (${t.from.join(", ")}) → ${t.path}`).join("; ")}`;
}
