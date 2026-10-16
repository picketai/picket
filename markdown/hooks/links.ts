const MARKDOWN_PATH = /\.(md|markdown)$/i
const MAX_LINKS = 200

const TOKEN =
  /\[([^\]\n]*)\]\(([^)\s]+)\)|`([^`\n]+)`|((?:[A-Za-z]:[\\/]|\.{1,2}[\\/]|[\\/])?[\w.@~-]+(?:[\\/][\w.@~-]+)*\.(?:md|markdown))(?![\w/\\])/g

export type FoundPath = { raw: string; absolute: string; href: string }

export type Linked = { text: string; hrefs: string[] }

function isRemote(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target) || /^(mailto|data):/i.test(target)
}

function withoutFragment(target: string): string {
  return target.replace(/[#?].*$/, '').replace(/:\d+(?::\d+)?$/, '')
}

export function isMarkdownPath(target: string): boolean {
  return !isRemote(target) && MARKDOWN_PATH.test(withoutFragment(target))
}

function isAbsolute(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\')
}

export function resolvePath(base: string, path: string): string {
  const joined = isAbsolute(path) ? path : `${base}/${path}`
  const parts = joined.replace(/\\/g, '/').split('/')
  const kept: string[] = []
  for (const part of parts) {
    if (part === '.' || (part === '' && kept.length > 0)) continue
    if (part === '..') {
      if (kept.length > 1) kept.pop()
      continue
    }
    kept.push(part)
  }
  return kept.join('/')
}

export function dirOf(path: string): string {
  const normal = path.replace(/\\/g, '/')
  const cut = normal.lastIndexOf('/')
  return cut <= 0 ? normal : normal.slice(0, cut)
}

export function baseName(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() ?? path
}

export function toHref(absolute: string): string {
  const slashed = absolute.startsWith('/') ? absolute : `/${absolute}`
  return `file://${encodeURI(slashed)}`
}

export function fromHref(href: string): string | undefined {
  if (!href.startsWith('file:')) return undefined
  const pathname = decodeURIComponent(new URL(href).pathname)
  return /^\/[A-Za-z]:\//.test(pathname) ? pathname.slice(1) : pathname
}

function splitFences(text: string): { text: string; isCode: boolean }[] {
  const pieces: { text: string; isCode: boolean }[] = []
  const fence = /^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm
  let last = 0
  for (const match of text.matchAll(fence)) {
    pieces.push({ text: text.slice(last, match.index), isCode: false })
    pieces.push({ text: match[0], isCode: true })
    last = match.index + match[0].length
  }
  pieces.push({ text: text.slice(last), isCode: false })
  return pieces
}

function bareAllowed(offset: number, all: string): boolean {
  const before = offset > 0 ? all[offset - 1] : ''
  return before === undefined || !/[\w:/\\]/.test(before)
}

export function candidatePaths(text: string): string[] {
  const found = new Set<string>()
  for (const piece of splitFences(text)) {
    if (piece.isCode) continue
    for (const match of piece.text.matchAll(TOKEN)) {
      if (match[4] !== undefined && !bareAllowed(match.index, piece.text)) continue
      const target = match[2] ?? match[3] ?? match[4]
      if (target !== undefined && isMarkdownPath(target.trim())) found.add(withoutFragment(target.trim()))
      if (found.size >= MAX_LINKS) return [...found]
    }
  }
  return [...found]
}

export function linkPaths(text: string, base: string, exists: ReadonlySet<string>): Linked {
  const hrefs = new Set<string>()
  const hrefFor = (target: string): string | undefined => {
    const absolute = resolvePath(base, withoutFragment(target.trim()))
    if (!exists.has(absolute) || hrefs.size >= MAX_LINKS) return undefined
    const href = toHref(absolute)
    hrefs.add(href)
    return href
  }

  const linked = splitFences(text)
    .map(piece => {
      if (piece.isCode) return piece.text
      return piece.text.replace(TOKEN, (whole, label, target, code, bare, offset: number, all: string) => {
        if (target !== undefined) {
          if (!isMarkdownPath(target)) return whole
          const href = hrefFor(target)
          return href === undefined ? whole : `[${label}](${href})`
        }
        if (code !== undefined) {
          if (!isMarkdownPath(code.trim())) return whole
          const href = hrefFor(code)
          return href === undefined ? whole : `[${whole}](${href})`
        }
        if (!bareAllowed(offset, all)) return whole
        const href = hrefFor(bare)
        return href === undefined ? whole : `[${bare}](${href})`
      })
    })
    .join('')

  return { text: linked, hrefs: [...hrefs] }
}
