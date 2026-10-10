const PLUGIN_PREFIXES = ["picket:", "tether:"];
const INSTANCE_NAME = /^(?:[a-z0-9]+-)*(analyst|architect|developer|reviewer)(?:-\d+)?$/;

export function bareAgentName(type) {
  if (typeof type !== "string" || type === "") return null;
  const prefix = PLUGIN_PREFIXES.find((p) => type.startsWith(p));
  const bare = prefix ? type.slice(prefix.length) : type;
  return bare.match(INSTANCE_NAME)?.[1] ?? bare;
}
