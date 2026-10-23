import { edgeContext } from "../../dist/lib/shared/context.mjs";

export function hookContext(root, overrides = {}) {
  return { ...edgeContext(root), ...overrides };
}
