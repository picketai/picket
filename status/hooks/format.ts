const FAMILY = /^claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/

export const prettyModel = (id: string): string => {
  const match = FAMILY.exec(id)
  const [, family, major, minor] = match ?? []
  if (family === undefined) {
    return id
  }
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`
}

export const compactTokens = (n: number): string => {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 100_000 ? 1 : 0)}k`
  }
  return String(n)
}

export const untilReset = (resetsAt: string | undefined, now: number): string => {
  if (resetsAt === undefined) {
    return '?'
  }
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0) {
    return `${days}d ${hours}hr`
  }
  return hours > 0 ? `${hours}hr ${rest}m` : `${rest}m`
}

export const bar = (percent: number, width: number): string => {
  const filled = Math.min(width, Math.round((percent / 100) * width))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const pack = (widths: number[], columns: number, separator: number): number[][] => {
  const rows: number[][] = []
  let row: number[] = []
  let used = 0
  widths.forEach((width, index) => {
    const needed = row.length === 0 ? width : used + separator + width
    if (row.length > 0 && needed > columns) {
      rows.push(row)
      row = [index]
      used = width
      return
    }
    row.push(index)
    used = needed
  })
  if (row.length > 0) {
    rows.push(row)
  }
  return rows
}

export const levelColor =(percent: number): string =>
  percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'
