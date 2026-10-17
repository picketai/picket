import { normalizeRoot } from "./kernel-call.mjs";
import { MARKER, POWERSHELL_FOLDABLE_MARKER, POWERSHELL_MARKER_STATEMENT } from "./escalation.mjs";

const CANONICAL_GROUPS = [
  ["Remove-Item", ["remove-item", "ri", "rm", "rmdir", "rd", "del", "erase"]],
  ["Stop-Process", ["stop-process", "spps", "kill"]],
  ["Clear-Content", ["clear-content", "clc"]],
  ["Clear-Item", ["clear-item", "cli"]],
  ["Remove-ItemProperty", ["remove-itemproperty", "rp"]],
  ["Format-Volume", ["format-volume"]],
  ["Clear-Disk", ["clear-disk"]],
  ["Stop-Computer", ["stop-computer"]],
  ["Restart-Computer", ["restart-computer"]],
  ["cd", ["set-location", "sl", "cd", "chdir", "push-location", "pushd"]],
  ["Get-ChildItem", ["get-childitem", "gci", "ls", "dir"]],
  ["Get-Content", ["get-content", "gc", "cat", "type"]],
  ["Select-String", ["select-string", "sls"]],
];
const CANONICAL_ROOTS = new Map(CANONICAL_GROUPS.flatMap(([name, aliases]) => aliases.map((alias) => [alias, name])));

const STATEMENT_BREAKS = new Set([";", "\n", "{", "}", "(", ")"]);
const WHITESPACE = /[ \t\r\f\v]/;
const NON_LITERAL_CALL_TARGET = /[$({@]/;
const STREAM_PREFIX = /^[1-6*]$/;
const REDIRECT = /^>>?(&[1-6])?/;
const DISCARD_TARGET = "$null";

export function canonicalRoot(word) {
  const name = normalizeRoot(word).toLowerCase();
  return CANONICAL_ROOTS.get(name) ?? name;
}

function markerAssignment(words) {
  const statement = words.join("");
  return `${MARKER}=${statement.slice(statement.indexOf("=") + 1)}`;
}

class Unreadable extends Error {}

class PowerShellReader {
  constructor(text) {
    this.text = text;
    this.i = 0;
    this.segments = [];
    this.words = [];
    this.word = null;
    this.pendingRedirect = false;
    this.hiddenExecution = false;
    this.sawWriteRedirect = false;
    this.sawBackground = false;
    this.redirectTargets = [];
    this.markers = [];
    this.readingMarker = false;
  }

  read() {
    while (this.i < this.text.length) this.step();
    this.endSegment();
    return {
      segments: this.foldedSegments(),
      hiddenExecution: this.hiddenExecution,
      sawWriteRedirect: this.sawWriteRedirect,
      sawBackground: this.sawBackground,
      redirectTargets: this.redirectTargets,
    };
  }

  at(offset = 0) {
    return this.text[this.i + offset];
  }

  startsWith(token) {
    return this.text.startsWith(token, this.i);
  }

  atStatementStart() {
    return this.word === null && this.words.length === 0;
  }

  append(text) {
    this.word = (this.word ?? "") + text;
  }

  foldedSegments() {
    const [marker] = this.markers;
    const foldable = this.markers.length === 1 && marker.index === 0 && marker.foldable && this.segments.length === 2;
    return foldable ? [[...this.segments[0], ...this.segments[1]]] : this.segments;
  }

  noteMarkerStatement() {
    const rest = this.text.slice(this.i);
    if (!POWERSHELL_MARKER_STATEMENT.test(rest)) return;
    this.readingMarker = true;
    this.markers.push({ index: this.segments.length, foldable: !this.text.slice(0, this.i).trim() && POWERSHELL_FOLDABLE_MARKER.test(rest) });
  }

  step() {
    const ch = this.at();
    if (ch === "$" && this.atStatementStart() && !this.readingMarker) this.noteMarkerStatement();
    if (this.word === null && (this.startsWith("@'\n") || this.startsWith("@'\r\n") || this.startsWith('@"\n') || this.startsWith('@"\r\n'))) return this.readHereString();
    if (ch === "'") return this.readSingleQuoted();
    if (ch === '"') return this.readDoubleQuoted();
    if (ch === "`") return this.readEscape();
    if (this.word === null && this.startsWith("<#")) return this.skipBlockComment();
    if (this.word === null && ch === "#") return this.skipLineComment();
    if (this.startsWith("$(") || this.startsWith("@(")) return this.breakStatement(2, { hidden: true });
    if (this.startsWith("${")) return this.readBracedVariable();
    if (this.startsWith("&&") || this.startsWith("||")) return this.breakStatement(2);
    if (ch === "|" || STATEMENT_BREAKS.has(ch)) return this.breakStatement(1);
    if (ch === "&") return this.readAmpersand();
    if (ch === "." && this.atStatementStart() && WHITESPACE.test(this.at(1) ?? "")) return this.readCallOperator();
    if (ch === ">") return this.readRedirect();
    if (WHITESPACE.test(ch)) {
      this.endWord();
      this.i++;
      return;
    }
    this.append(ch);
    this.i++;
  }

  readSingleQuoted() {
    let text = "";
    for (let j = this.i + 1; j < this.text.length; j++) {
      if (this.text[j] !== "'") text += this.text[j];
      else if (this.text[j + 1] === "'") text += this.text[++j];
      else {
        this.append(text);
        this.i = j + 1;
        return;
      }
    }
    throw new Unreadable();
  }

  readDoubleQuoted() {
    let text = "";
    for (let j = this.i + 1; j < this.text.length; j++) {
      const ch = this.text[j];
      if (ch === "`") text += this.text[++j] ?? "";
      else if (ch === '"' && this.text[j + 1] === '"') text += this.text[++j];
      else if (ch === '"') {
        if (text.includes("$(")) this.hiddenExecution = true;
        this.append(text);
        this.i = j + 1;
        return;
      } else text += ch;
    }
    throw new Unreadable();
  }

  readHereString() {
    const quote = this.at(1);
    const bodyStart = this.text.indexOf("\n", this.i) + 1;
    const closing = this.text.indexOf(`\n${quote}@`, bodyStart - 1);
    if (closing === -1) throw new Unreadable();
    const body = this.text.slice(bodyStart, closing).replace(/\r$/, "");
    if (quote === '"' && body.includes("$(")) this.hiddenExecution = true;
    this.append(body);
    this.i = closing + 3;
  }

  readEscape() {
    const next = this.at(1);
    if (next === "\n" || (next === "\r" && this.at(2) === "\n")) {
      this.endWord();
      this.i += next === "\n" ? 2 : 3;
      return;
    }
    this.append(next ?? "");
    this.i += 2;
  }

  readBracedVariable() {
    const close = this.text.indexOf("}", this.i);
    if (close === -1) throw new Unreadable();
    this.append(this.text.slice(this.i, close + 1));
    this.i = close + 1;
  }

  skipLineComment() {
    const end = this.text.indexOf("\n", this.i);
    this.i = end === -1 ? this.text.length : end;
  }

  skipBlockComment() {
    const end = this.text.indexOf("#>", this.i + 2);
    if (end === -1) throw new Unreadable();
    this.i = end + 2;
  }

  readAmpersand() {
    if (this.atStatementStart()) return this.readCallOperator();
    this.sawBackground = true;
    this.breakStatement(1);
  }

  readCallOperator() {
    this.i++;
    while (WHITESPACE.test(this.at() ?? "")) this.i++;
    if (NON_LITERAL_CALL_TARGET.test(this.at() ?? "")) this.hiddenExecution = true;
  }

  readRedirect() {
    if (this.word !== null && STREAM_PREFIX.test(this.word)) this.word = null;
    else this.endWord();
    const [token, plumbing] = REDIRECT.exec(this.text.slice(this.i));
    this.i += token.length;
    if (!plumbing) this.pendingRedirect = true;
  }

  breakStatement(length, { hidden = false } = {}) {
    if (hidden) this.hiddenExecution = true;
    this.endSegment();
    this.i += length;
  }

  endWord() {
    if (this.word === null) return;
    if (this.pendingRedirect) this.recordRedirect(this.word);
    else this.words.push(this.word);
    this.word = null;
  }

  recordRedirect(target) {
    this.pendingRedirect = false;
    if (typeof target === "string" && target.toLowerCase() === DISCARD_TARGET) return;
    this.sawWriteRedirect = true;
    this.redirectTargets.push(target);
  }

  endSegment() {
    this.endWord();
    if (this.pendingRedirect) this.recordRedirect(null);
    if (this.words.length) this.segments.push(this.readingMarker ? [markerAssignment(this.words)] : [canonicalRoot(this.words[0]), ...this.words.slice(1)]);
    this.words = [];
    this.readingMarker = false;
  }
}

export function readPowerShell(text) {
  try {
    return new PowerShellReader(text).read();
  } catch (error) {
    if (error instanceof Unreadable) return null;
    throw error;
  }
}
