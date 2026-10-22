export interface ParseError {
  error: number;
  offset: number;
  length: number;
}

export interface ParseOptions {
  disallowComments?: boolean;
  allowTrailingComma?: boolean;
  allowEmptyContent?: boolean;
}

export type JSONPath = (string | number)[];

export interface Edit {
  offset: number;
  length: number;
  content: string;
}

export interface FormattingOptions {
  tabSize?: number;
  insertSpaces?: boolean;
  eol?: string;
  insertFinalNewline?: boolean;
  keepLines?: boolean;
}

export interface ModificationOptions {
  formattingOptions?: FormattingOptions;
  isArrayInsertion?: boolean;
  getInsertionIndex?: (properties: string[]) => number;
}

export function parse(text: string, errors?: ParseError[], options?: ParseOptions): unknown;
export function modify(text: string, path: JSONPath, value: unknown, options: ModificationOptions): Edit[];
export function applyEdits(text: string, edits: Edit[]): string;
