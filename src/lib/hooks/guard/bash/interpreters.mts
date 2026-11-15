export type Family = {
  names: readonly string[];
  takesProgram: (word: string) => boolean;
  valueFlags: ReadonlySet<string>;
  writeCall: RegExp;
  subcommand?: string;
  inPlace?: (args: string[]) => string[];
};

const PROGRAM_CLUSTER = /^-[A-Za-z]*[cepE]$/;
const PROGRAM_LONG_FLAGS = new Set(["--eval", "--print"]);
const EDITOR_PROGRAM_CLUSTER = /^-[A-Za-z]*[eE]$/;
const IN_PLACE_CLUSTER = /^-[aclnpsTtuUwWX0-9]*i/;
const WRITE_CALL = /\.write\(|write_text\(|writeFileSync\(|writeFile\(|appendFileSync\(|File\.write|\bopen\([^)]*?(['"])[rbt]*[wa+][rwabt+]*\1|\bopen[ \t]*\(?[^;)\n'"]*['"](?:>|\+[<>])/;
const NO_VALUE_FLAGS: ReadonlySet<string> = new Set();
const VERSIONED_NAME = /^([a-z]+?)(?:-?\d+(?:\.\d+)*[a-z]?)?$/;

const takesProgramFlag = (word: string): boolean => PROGRAM_CLUSTER.test(word) || PROGRAM_LONG_FLAGS.has(word);
const takesEditorProgram = (word: string): boolean => EDITOR_PROGRAM_CLUSTER.test(word);

function editedFileOperands(args: string[]): string[] {
  if (!args.some((word) => IN_PLACE_CLUSTER.test(word))) return [];
  const positional: string[] = [];
  let programGiven = false;
  for (let i = 0; i < args.length; i++) {
    if (EDITOR_PROGRAM_CLUSTER.test(args[i])) {
      programGiven = true;
      i++;
    } else if (!args[i].startsWith("-")) positional.push(args[i]);
  }
  return programGiven ? positional : positional.slice(1);
}

const flagProgram = (names: string[], valueFlags: string[] = []): Family => ({
  names,
  takesProgram: takesProgramFlag,
  valueFlags: valueFlags.length === 0 ? NO_VALUE_FLAGS : new Set(valueFlags),
  writeCall: WRITE_CALL,
});

const inPlaceEditor = (names: string[]): Family => ({
  names,
  takesProgram: takesEditorProgram,
  valueFlags: NO_VALUE_FLAGS,
  writeCall: WRITE_CALL,
  inPlace: editedFileOperands,
});

export const FAMILIES: readonly Family[] = [
  flagProgram(["python", "pypy", "py"], ["-W", "-X", "--check-hash-based-pycs"]),
  flagProgram(["node", "nodejs"], ["-r", "--require", "--import", "--loader", "--experimental-loader", "-C", "--conditions", "--input-type"]),
  inPlaceEditor(["perl"]),
  inPlaceEditor(["ruby"]),
  flagProgram(["bun"]),
  { ...flagProgram(["deno"]), subcommand: "eval" },
];

const BY_NAME: ReadonlyMap<string, Family> = new Map(FAMILIES.flatMap((family) => family.names.map((name) => [name, family] as const)));

export function familyOf(root: string): Family | undefined {
  const base = VERSIONED_NAME.exec(root.toLowerCase())?.[1];
  return base === undefined ? undefined : BY_NAME.get(base);
}
