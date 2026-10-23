const MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;
const FAMILY = /^claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/;

function twoDigits(n: number): string {
  return String(n).padStart(2, "0");
}

export function roleOf(type: string): string {
  return type.replace(/^picket:/, "");
}

export function prettyModel(id: string): string {
  const [, family, major, minor] = FAMILY.exec(id) ?? [];
  if (family === undefined) return id;
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
}

export function compactTokens(n: number): string {
  if (n < 1000) return String(n);
  const hundreds = Math.round(n / 100);
  if (hundreds < 100) return `${(hundreds / 10).toFixed(1)}k`;
  const thousands = Math.round(n / 1000);
  if (thousands < 1000) return `${thousands}k`;
  return `${(Math.round(n / 100_000) / 10).toFixed(1)}M`;
}

export function minutes(ms: number): string {
  const whole = Math.max(0, Math.floor(ms / MINUTE));
  const days = Math.floor(whole / MINUTES_PER_DAY);
  const hours = Math.floor(whole / 60);
  if (days > 0) return `${days}d${twoDigits(hours % 24)}h`;
  return hours > 0 ? `${hours}h${twoDigits(whole % 60)}m` : `${whole}m`;
}

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${twoDigits(seconds % 60)}s`;
  return minutes(ms);
}

export function clock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const wholeMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(wholeMinutes / 60);
  if (hours > 0) return `${hours}:${twoDigits(wholeMinutes % 60)}:${twoDigits(seconds % 60)}`;
  return `${wholeMinutes}:${twoDigits(seconds % 60)}`;
}
