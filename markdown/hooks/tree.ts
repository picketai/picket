import { baseName, dirOf } from './links'

export type TreeRow =
  | { kind: 'folder'; dir: string; label: string; isClosed: boolean }
  | { kind: 'file'; path: string; label: string; depth: number; isSelected: boolean }

export function folderOf(cwd: string, path: string): string | undefined {
  const rel = relative(cwd, path)
  return rel.includes('/') ? dirOf(rel) : undefined
}

export function relative(cwd: string, path: string): string {
  const root = cwd.replace(/\\/g, '/').replace(/\/$/, '')
  const normal = path.replace(/\\/g, '/')
  return normal.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? normal.slice(root.length + 1) : normal
}

export function folders(files: readonly string[], cwd: string): string[] {
  const dirs = new Set<string>()
  for (const file of files) {
    const rel = relative(cwd, file)
    if (rel.includes('/')) dirs.add(dirOf(rel))
  }
  return [...dirs].sort()
}

export function treeRows(
  files: readonly string[],
  cwd: string,
  closed: Readonly<Record<string, boolean>>,
  selected: string | undefined,
): TreeRow[] {
  const groups = new Map<string, string[]>()
  const loose: string[] = []
  for (const file of files) {
    const rel = relative(cwd, file)
    if (!rel.includes('/')) {
      loose.push(file)
      continue
    }
    const dir = dirOf(rel)
    groups.set(dir, [...(groups.get(dir) ?? []), file])
  }

  const isSelected = (file: string) => selected !== undefined && file.toLowerCase() === selected.toLowerCase()
  const rows: TreeRow[] = []
  for (const dir of [...groups.keys()].sort()) {
    const isClosed = closed[dir] === true
    rows.push({ kind: 'folder', dir, label: `${dir}/`, isClosed })
    if (isClosed) continue
    for (const file of (groups.get(dir) ?? []).sort((a, b) => baseName(a).localeCompare(baseName(b)))) {
      rows.push({ kind: 'file', path: file, label: baseName(file), depth: 1, isSelected: isSelected(file) })
    }
  }
  for (const file of loose.sort((a, b) => baseName(a).localeCompare(baseName(b)))) {
    rows.push({ kind: 'file', path: file, label: baseName(file), depth: 0, isSelected: isSelected(file) })
  }
  return rows
}
