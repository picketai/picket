const PLUGIN_PREFIX = "tether:";

export function bareAgentName(type) {
  if (typeof type !== "string" || type === "") return null;
  return type.startsWith(PLUGIN_PREFIX) ? type.slice(PLUGIN_PREFIX.length) : type;
}
