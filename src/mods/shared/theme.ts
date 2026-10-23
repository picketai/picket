export type Tone = 'accent' | 'muted' | 'rule' | 'warning' | 'error' | 'success' | 'link' | 'code' | 'control'

export const TONES: Record<Tone, string> = {
  accent: 'claude',
  muted: 'inactive',
  rule: 'promptBorder',
  warning: 'warning',
  error: 'error',
  success: 'success',
  link: 'suggestion',
  code: 'permission',
  control: 'claudeShimmer',
}

export const SURFACES = {
  pane: 'bashMessageBackgroundColor',
  code: 'userMessageBackground',
  row: 'userMessageBackgroundHover',
} as const

export const ROLE_TONES: Record<string, string> = {
  architect: 'suggestion',
  developer: 'success',
  reviewer: 'permission',
  analyst: 'claudeShimmer',
}
