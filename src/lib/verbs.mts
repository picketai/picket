export type VerbEntry = { summary: string; readOnly: boolean; leadOnly?: boolean };
export type SubverbEntry = { summary: string; readOnly: boolean };
export type GroupEntry = { summary: string; subverbs: Record<string, SubverbEntry> };

export const VERB_NAMES = {
  leave: { summary: "record a command the user runs after the item closes", readOnly: false },
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
