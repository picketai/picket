export type VerbEntry = { summary: string; readOnly: boolean; leadOnly?: boolean };
export type SubverbEntry = { summary: string; readOnly: boolean };
export type GroupEntry = { summary: string; subverbs: Record<string, SubverbEntry> };

export const VERB_NAMES = {
  admit: { summary: "choose the lane for a change request", readOnly: true },
  close: { summary: "mark a work item done and commit what it owns", readOnly: false },
  comment: { summary: "record the user's approval of one code comment", readOnly: false, leadOnly: true },
  cost: { summary: "sum the ledger: turns, spend, cache, stops, bounces, escalations", readOnly: true },
  init: { summary: "set up Picket in a project", readOnly: false },
  leave: { summary: "record a command the user runs after the item closes", readOnly: false },
  list: { summary: "list the work items with their lane, status, phases and next action", readOnly: true },
  migrate: { summary: "move state from the old locations to .picket/", readOnly: false },
  next: { summary: "print the next action for a work item, or for the latest open one", readOnly: true },
  packet: { summary: "print the gate packet the lead shows the user", readOnly: true },
  preflight: { summary: "check the inputs, the tree and the tooling before a lane starts", readOnly: true },
  route: { summary: "apply a verdict to a work item", readOnly: false },
  set: { summary: "change a work item's status, blocked reason, branch, title or run grant", readOnly: false },
  state: { summary: "print a work item's derived state", readOnly: true },
  verify: { summary: "check one phase against its must_haves", readOnly: true },
  waive: { summary: "record the user's approval of one silenced check", readOnly: false, leadOnly: true },
} as const satisfies Record<string, VerbEntry | GroupEntry>;

export type Verb = keyof typeof VERB_NAMES;

type CommandsOf<V extends Verb> = (typeof VERB_NAMES)[V] extends { subverbs: infer S } ? `${V} ${keyof S & string}` : V;

export type Command = { [V in Verb]: CommandsOf<V> }[Verb];

export function isGroup(entry: VerbEntry | GroupEntry): entry is GroupEntry {
  return "subverbs" in entry;
}

export function listCommands(): Command[] {
  const names: Record<string, VerbEntry | GroupEntry> = VERB_NAMES;
  return Object.entries(names).flatMap(([name, entry]) => (isGroup(entry) ? Object.keys(entry.subverbs).map((sub) => `${name} ${sub}`) : [name])) as Command[];
}
