export type Family = {
  names: readonly string[];
  takesProgram: (word: string) => boolean;
  programFlags?: readonly string[];
  valueFlags: ReadonlySet<string>;
  writeCall: RegExp;
  programOperand?: true;
  scriptFlags?: readonly string[];
  subcommand?: string;
  inPlace?: (args: string[]) => string[];
  namedTarget?: RegExp;
};

const PROGRAM_CLUSTER = /^-[A-Za-z]*[cepE]$/;
const PROGRAM_LONG_FLAGS = new Set(["--eval", "--print"]);
const EDITOR_PROGRAM_CLUSTER = /^-[A-Za-z]*[eE]$/;
const IN_PLACE_CLUSTER = /^-[aclnpsTtuUwWX0-9]*i/;
const WRITE_CALL = /\.write\(|write_text\(|writeFileSync\(|writeFile\(|appendFileSync\(|File\.write|\bopen\([^)]*?(['"])[rbt]*[wa+][rwabt+]*\1|\bopen[ \t]*\(?[^;)\n'"]*['"](?:>|\+[<>])/;
const PHP_WRITE_CALL = /\bfile_put_contents\(|\bfopen\([^)]*?(['"])[waxc][bt+]*\1/;
const LUA_WRITE_CALL = /\bio\.open\([^)]*?(['"])[wa][b+]*\1|\bio\.output\(/;
const R_WRITE_CALL = /\bwriteLines\(|\bwriteChar\(|\bwriteBin\(|\bwrite(?:\.\w+)?\(|\bsink\(|\bcat\([^)]*\bfile\s*=|\bfile\([^)]*?(['"])[wa][bt+]*\1/;
const AWK_WRITE_CALL = />>?[ \t]*"/;
const TCL_WRITE_MODE = String.raw`(?:"?(?:[wa]\+?|r\+)"?|\{[^}]*\b(?:WRONLY|RDWR)\b[^}]*\}|"[^"]*\b(?:WRONLY|RDWR)\b[^"]*")`;
const TCL_OPEN_FOR_WRITE = String.raw`\bopen[ \t]+["{]?([^\s"{}\[\];]+)["}]?[ \t]+${TCL_WRITE_MODE}(?=[\s\]]|$)`;
const NO_VALUE_FLAGS: ReadonlySet<string> = new Set();
const VERSIONED_NAME = /^([a-z]+?)(?:-?\d+(?:\.\d+)*[a-z]?)?$/;

const takesProgramFlag = (word: string): boolean => PROGRAM_CLUSTER.test(word) || PROGRAM_LONG_FLAGS.has(word);
const takesEditorProgram = (word: string): boolean => EDITOR_PROGRAM_CLUSTER.test(word);

export type ClusterFlag = { flag: string; rest: string };

const ASCII_LETTER = /^[A-Za-z]$/;

function longFlag(word: string, flags: readonly string[]): ClusterFlag | undefined {
  for (const flag of flags.filter((listed) => listed.startsWith("--"))) {
    if (word === flag) return { flag, rest: "" };
    if (word.startsWith(`${flag}=`)) return { flag, rest: word.slice(flag.length + 1) };
  }
  return undefined;
}

function shortCluster(word: string, flags: readonly string[], stops: ReadonlySet<string>): ClusterFlag | undefined {
  for (let i = 1; i < word.length; i++) {
    if (!ASCII_LETTER.test(word[i])) return undefined;
    const flag = `-${word[i]}`;
    if (flags.includes(flag)) return { flag, rest: word.slice(i + 1) };
    if (stops.has(flag)) return undefined;
  }
  return undefined;
}

export function clusterFlag(word: string, flags: readonly string[], stops: ReadonlySet<string>): ClusterFlag | undefined {
  if (word.startsWith("--")) return longFlag(word, flags);
  return word.startsWith("-") ? shortCluster(word, flags, stops) : undefined;
}

const listedProgramFlags = (...flags: string[]): Pick<Family, "takesProgram" | "programFlags"> => ({
  takesProgram: (word) => flags.includes(word),
  programFlags: flags,
});

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

const AWK_PROGRAM_FLAGS = ["-e", "--source"];
const AWK_SCRIPT_FLAGS = ["-f", "--file", "-E"];
const AWK_PROGRAM_SOURCES = [...AWK_PROGRAM_FLAGS, ...AWK_SCRIPT_FLAGS];
const AWK_VALUE_FLAGS: ReadonlySet<string> = new Set(["-F", "-v", "-f", "-i", "-l", "-E", "--field-separator", "--assign", "--file", "--include", "--load"]);
const AWK_CLUSTER_STOPS: ReadonlySet<string> = new Set([...AWK_VALUE_FLAGS, ...AWK_PROGRAM_FLAGS]);
const INPLACE_LIBRARY = /^inplace(?:\.awk)?$/;
const ATTACHED_INPLACE = /^(?:-i|--include=)inplace(?:\.awk)?$/;

function loadsInplace(args: string[]): boolean {
  return args.some((word, i) => ATTACHED_INPLACE.test(word) || ((word === "-i" || word === "--include") && INPLACE_LIBRARY.test(args[i + 1] ?? "")));
}

function awkFileOperands(args: string[]): string[] {
  const operands: string[] = [];
  let programGiven = false;
  for (let i = 0; i < args.length; i++) {
    const source = clusterFlag(args[i], AWK_PROGRAM_SOURCES, AWK_CLUSTER_STOPS);
    if (source !== undefined) {
      programGiven = true;
      if (source.rest === "") i++;
    } else if (AWK_VALUE_FLAGS.has(args[i])) i++;
    else if (!args[i].startsWith("-")) operands.push(args[i]);
  }
  return programGiven ? operands : operands.slice(1);
}

const awkInPlace = (args: string[]): string[] => (loadsInplace(args) ? awkFileOperands(args) : []);

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
  { names: ["php"], ...listedProgramFlags("-r", "-B", "-R", "-E"), valueFlags: new Set(["-c", "-d", "-z"]), writeCall: PHP_WRITE_CALL },
  { names: ["lua", "luajit"], ...listedProgramFlags("-e"), valueFlags: new Set(["-l"]), writeCall: LUA_WRITE_CALL },
  { names: ["r", "rscript"], ...listedProgramFlags("-e"), valueFlags: NO_VALUE_FLAGS, writeCall: R_WRITE_CALL, scriptFlags: ["-f", "--file"] },
  {
    names: ["awk", "gawk", "mawk", "nawk"],
    ...listedProgramFlags(...AWK_PROGRAM_FLAGS),
    valueFlags: AWK_VALUE_FLAGS,
    writeCall: AWK_WRITE_CALL,
    programOperand: true,
    scriptFlags: AWK_SCRIPT_FLAGS,
    inPlace: awkInPlace,
  },
  {
    names: ["tclsh", "wish"],
    takesProgram: () => false,
    valueFlags: new Set(["-encoding"]),
    writeCall: new RegExp(TCL_OPEN_FOR_WRITE),
    namedTarget: new RegExp(TCL_OPEN_FOR_WRITE, "g"),
  },
];

const BY_NAME: ReadonlyMap<string, Family> = new Map(FAMILIES.flatMap((family) => family.names.map((name) => [name, family] as const)));

export function familyOf(root: string): Family | undefined {
  const base = VERSIONED_NAME.exec(root.toLowerCase())?.[1];
  return base === undefined ? undefined : BY_NAME.get(base);
}
