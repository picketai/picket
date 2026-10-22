const PLUGIN_PREFIX = "picket:";
const INSTANCE_NAME = /^(?:[a-z0-9]+-)*(analyst|architect|developer|reviewer)(?:-\d+)?$/;

export function bareAgentName(type) {
  if (typeof type !== "string" || type === "") return null;
  const bare = type.startsWith(PLUGIN_PREFIX) ? type.slice(PLUGIN_PREFIX.length) : type;
  return bare.match(INSTANCE_NAME)?.[1] ?? bare;
}
