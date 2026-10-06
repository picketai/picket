// A deliberately small YAML subset, so the harness carries no runtime dependency into host projects.
// Supported: `key: scalar`, `key: [a, b]`, `key:` followed by an indented block of `key: value`
// lines, and `key:` followed by a block list whose items are `- key: value` maps or `- scalar`.
// One level of nesting inside list items. Comments start with `#`. Strings may be quoted.
// Anything else throws, which is the point: the files this reads are written by this harness.

export function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const root = {};
  let i = 0;

  function indentOf(line) {
    return line.match(/^ */)[0].length;
  }
  function meaningful(line) {
    const t = line.trim();
    return t !== "" && !t.startsWith("#");
  }
  function scalar(raw) {
    const s = raw.trim();
    if (s === "" || s === "null" || s === "~") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s.startsWith("[") && s.endsWith("]")) {
      const inner = s.slice(1, -1).trim();
      return inner === "" ? [] : splitInline(inner).map(scalar);
    }
    // Quoted scalars carry escapes: "lines\\[0\\]" is the regex lines\[0\] (an architect writing a
    // grep pattern in double quotes doubles the backslashes, as YAML requires), '' inside '…' is '.
    if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1).replace(/\\(["\\/nrt])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t" })[c] ?? c);
    if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replaceAll("''", "'");
    return s;
  }
  function splitInline(s) {
    const out = [];
    let cur = "";
    let q = null;
    for (const ch of s) {
      if (q) {
        cur += ch;
        if (ch === q) q = null;
      } else if (ch === '"' || ch === "'") {
        q = ch;
        cur += ch;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    if (cur.trim() !== "") out.push(cur);
    return out;
  }

  function parseMap(indent, target) {
    while (i < lines.length) {
      const line = lines[i];
      if (!meaningful(line)) {
        i++;
        continue;
      }
      const ind = indentOf(line);
      if (ind < indent) return target;
      if (ind > indent) throw new Error(`yaml-lite: unexpected indent at line ${i + 1}: ${line}`);
      const m = line.trim().match(/^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/);
      if (!m) throw new Error(`yaml-lite: expected "key: value" at line ${i + 1}: ${line}`);
      const [, key, rest] = m;
      i++;
      if (rest !== undefined && rest.trim() !== "") {
        target[key] = scalar(rest);
        continue;
      }
      // block value: look at the next meaningful line
      let j = i;
      while (j < lines.length && !meaningful(lines[j])) j++;
      if (j >= lines.length || indentOf(lines[j]) <= indent) {
        target[key] = null;
        continue;
      }
      const childIndent = indentOf(lines[j]);
      if (lines[j].trim().startsWith("- ")) target[key] = parseList(childIndent);
      else target[key] = parseMap(childIndent, {});
    }
    return target;
  }

  function parseList(indent) {
    const out = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!meaningful(line)) {
        i++;
        continue;
      }
      const ind = indentOf(line);
      if (ind < indent) return out;
      if (ind > indent || !line.trim().startsWith("- ")) throw new Error(`yaml-lite: expected list item at line ${i + 1}: ${line}`);
      const body = line.trim().slice(2);
      const m = body.match(/^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/);
      if (!m) {
        out.push(scalar(body));
        i++;
        continue;
      }
      // map item: rewrite the first line as an indented key so parseMap can consume the block
      const itemIndent = indent + 2;
      lines[i] = " ".repeat(itemIndent) + body;
      out.push(parseMap(itemIndent, {}));
    }
    return out;
  }

  parseMap(0, root);
  return root;
}

export function stringify(obj, indent = 0) {
  const pad = " ".repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${pad}${key}: []`);
      else if (value.every((v) => v === null || typeof v !== "object")) lines.push(`${pad}${key}: [${value.map(fmtScalar).join(", ")}]`);
      else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          const inner = stringify(item, indent + 4).split("\n");
          lines.push(`${pad}  - ${inner[0].trimStart()}`);
          for (const l of inner.slice(1)) lines.push(l);
        }
      }
    } else if (value !== null && typeof value === "object") {
      lines.push(`${pad}${key}:`);
      lines.push(stringify(value, indent + 2));
    } else lines.push(`${pad}${key}: ${fmtScalar(value)}`);
  }
  return lines.join("\n");
}

function fmtScalar(v) {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return /^[A-Za-z0-9_./:@+-][^#\[\],]*$/.test(s) && !/^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s) && !/:\s/.test(s) ? s : JSON.stringify(s);
}

/** Splits `---\nyaml\n---\nbody` into { front, body }. Files without frontmatter return front = {}. */
export function frontmatter(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { front: {}, body: text };
  return { front: parse(m[1]), body: m[2] };
}
