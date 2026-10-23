export function candidate(label, sha256, { main = false, branch = label, worktree = null, commit = null, dirty = false, bytes = Buffer.from(label) } = {}) {
  return { label, worktree, branch, commit, main, sha256, dirty, bytes };
}

export function lookupOf(table) {
  const bySource = (source) => table[source.name] ?? {};
  return {
    candidates: (source, path) => bySource(source)[path] ?? [],
    labels: (source) => [...new Set(Object.values(bySource(source)).flatMap((found) => found.map((c) => c.label)))],
  };
}

export function only(record, ...keys) {
  return Object.fromEntries(keys.map((key) => [key, record[key]]));
}
