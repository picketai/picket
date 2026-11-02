import type { ListRowView } from '../../../lib/shared/views.mts'
import { ACTION_TEXT, isNextAction } from '../../../lib/shared/work/action-text.mts'
import { TONES } from '../../shared/theme'
import type { GroupedSession, Piece } from '../types'
import { SESSION_GROUPS } from './work-pane'

const GAP: Piece = { text: '  ' }

const urgency = (item: ListRowView): number => SESSION_GROUPS.findIndex(one => one.group === item.attention)

const mostUrgent = (items: readonly ListRowView[]): ListRowView | undefined =>
  items.reduce<ListRowView | undefined>((most, item) => (most === undefined || urgency(item) < urgency(most) ? item : most), undefined)

const closedPieces = (item: ListRowView): Piece[] => [
  item.status === 'abandoned' ? { text: 'abandoned', color: TONES.muted } : { text: 'closed', color: TONES.success },
  ...(item.branch === null ? [] : [GAP, { text: `⎇ ${item.branch}`, color: TONES.accent }]),
  ...(item.worktrees.some(tree => tree.present) ? [GAP, { text: 'worktree', color: TONES.warning }] : []),
]

const phaseDots = (item: ListRowView): Piece[] =>
  item.phase_count === 0
    ? []
    : [
        GAP,
        ...Array.from({ length: item.phase_count }, (_, index): Piece =>
          index < item.phases_approved ? { text: '●', color: TONES.accent } : { text: '○', color: TONES.rule },
        ),
      ]

const stepText = (item: ListRowView): string =>
  isNextAction(item.next) ? ACTION_TEXT[item.next]({ actor: item.actor, phase: item.phase, lane: item.lane, detail: item.detail }, 'user') : item.detail

const stepPiece = (item: ListRowView): Piece => {
  const text = stepText(item)
  if (item.status === 'blocked') return { text: `${text} ◀`, color: TONES.error, bold: true }
  if (item.attention === 'needs-you') return { text: `${text} ◀`, color: TONES.warning, bold: true }
  return { text, color: item.attention === 'working' ? TONES.accent : TONES.muted }
}

const openPieces = (item: ListRowView): Piece[] => [{ text: item.lane, color: TONES.accent }, ...phaseDots(item), GAP, stepPiece(item)]

export function detailPieces(session: GroupedSession): Piece[] {
  const item = mostUrgent(session.items)
  if (item === undefined) return []
  const others = session.items.length - 1
  return [
    ...(item.attention === 'closed' ? closedPieces(item) : openPieces(item)),
    ...(others > 0 ? [{ text: `  +${others}`, color: TONES.muted }] : []),
  ]
}
