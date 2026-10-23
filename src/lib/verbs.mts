export type VerbEntry = { summary: string; readOnly: boolean; leadOnly?: boolean };
export type SubverbEntry = { summary: string; readOnly: boolean };
export type GroupEntry = { summary: string; subverbs: Record<string, SubverbEntry> };

export const VERB_NAMES = {
  admit: { summary: "choose the lane for a change request", readOnly: true },
  check: { summary: "run the project's test and lint commands and log them", readOnly: false },
  close: { summary: "mark a work item done and commit what it owns", readOnly: false },
  comment: { summary: "record the user's approval of one code comment", readOnly: false, leadOnly: true },
  cost: { summary: "sum the ledger: turns, spend, cache, stops, bounces, escalations", readOnly: true },
  drive: { summary: "start the app or run a command, exercise it, stop it and log the evidence", readOnly: false },
  extension: {
    summary: "manage the project's extensions",
    subverbs: {
      add: { summary: "write a new extension's manifest and enable it", readOnly: false },
      list: { summary: "list the enabled, refused and unlisted extensions", readOnly: true },
    },
  },
  init: { summary: "set up Picket in a project", readOnly: false },
  leave: { summary: "record a command the user runs after the item closes", readOnly: false },
  list: { summary: "list the work items with their lane, status, phases and next action", readOnly: true },
  migrate: { summary: "move state from the old locations to .picket/", readOnly: false },
  mutate: { summary: "plant one mutant in the phase's code and check the tests catch it", readOnly: false },
  next: { summary: "print the next action for a work item, or for the latest open one", readOnly: true },
  open: { summary: "open a work item in a lane", readOnly: false },
  packet: { summary: "print the gate packet the lead shows the user", readOnly: true },
  preflight: { summary: "check the inputs, the tree and the tooling before a lane starts", readOnly: true },
  pullrequest: {
    summary: "review a pull request with the same summary a phase gets",
    subverbs: {
      prepare: { summary: "fetch a pull request and summarize its diff for the reviewer", readOnly: false },
      post: { summary: "post a review file to a pull request as threads", readOnly: false },
    },
  },
  route: { summary: "apply a verdict to a work item", readOnly: false },
  set: { summary: "change a work item's status, blocked reason, branch, title or run grant", readOnly: false },
  source: {
    summary: "search a read-only source and bring its documents into a work item",
    subverbs: {
      find: { summary: "list the tracked files whose path contains a substring", readOnly: true },
      grep: { summary: "search every worktree and branch of a source with a regex", readOnly: true },
      pick: { summary: "choose one version of an ambiguous story reference", readOnly: false },
      add: { summary: "snapshot a reference into a work item after intake", readOnly: false },
    },
  },
  state: { summary: "print a work item's derived state", readOnly: true },
  statusline: { summary: "print the Claude Code status line", readOnly: false },
  style: {
    summary: "give Claude Code and the terminal the PicketAI look, or take it away",
    subverbs: {
      apply: { summary: "install the theme, font, terminal colours and status line", readOnly: false },
      remove: { summary: "remove the styling items you choose, or all of them with --all", readOnly: false },
    },
  },
  summary: { summary: "summarize a work item's diff, or a commit range, for the reviewer", readOnly: true },
  uninstall: { summary: "remove Picket from a project: what init added, its state and, if chosen, work/", readOnly: false, leadOnly: true },
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
