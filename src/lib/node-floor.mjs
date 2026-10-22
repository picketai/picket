export const NODE_FLOOR = 22;

export function checkNodeFloor(version) {
  const major = Number(version.split(".")[0]);
  return major >= NODE_FLOOR ? null : `Picket needs Node ${NODE_FLOOR} or newer; this is ${version}`;
}
