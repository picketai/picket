export type ControlOperator = "||" | "&&" | ";;" | "|&" | "<(" | "<<<" | ">>" | ">&" | "<&" | "&" | ";" | "(" | ")" | "|" | "<" | ">";

export type ParseEntry = string | { op: ControlOperator } | { op: "glob"; pattern: string } | { comment: string };

export type Env = Record<string, string | object | undefined> | ((key: string) => string | object | undefined);

export interface ParseOptions {
  escape?: string;
}

export function parse(command: string, env?: Env, opts?: ParseOptions): ParseEntry[];
