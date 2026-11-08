export const MOD_SWITCHES = ["markdown"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function modEnabled(config: unknown, name: string): boolean {
  if (!isRecord(config) || !isRecord(config.mods)) return true;
  return config.mods[name] !== false;
}
