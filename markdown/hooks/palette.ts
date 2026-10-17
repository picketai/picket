export type Tone = 'accent' | 'link' | 'code' | 'rule' | 'muted' | 'control'

export const TONES: Record<Tone, string> = {
  accent: 'claude',
  link: 'suggestion',
  code: 'permission',
  rule: 'promptBorder',
  muted: 'inactive',
  control: 'claudeShimmer',
}

export const SURFACES = {
  pane: 'bashMessageBackgroundColor',
  code: 'userMessageBackground',
  row: 'userMessageBackgroundHover',
} as const
