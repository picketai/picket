import type { Component } from "./change.mts";
import { component as font } from "./components/font/index.mts";
import { component as statusline } from "./components/statusline/index.mts";
import { component as terminal } from "./components/terminal/index.mts";
import { component as theme } from "./components/theme/index.mts";

export const COMPONENT_NAMES = ["theme", "font", "terminal", "statusline"] as const;
export type ComponentName = (typeof COMPONENT_NAMES)[number];

const BY_NAME = { theme, font, terminal, statusline } satisfies Record<ComponentName, Component>;

export const COMPONENTS: readonly Component[] = COMPONENT_NAMES.map((name) => BY_NAME[name]);
