import { describe, expect, test } from 'claude-code/testing'

import { viewOf } from './pane-actions'

describe('pane view', () => {
  test('a view stored before folding existed reads with NO WORK ITEM folded and keeps its other fields', async () => {
    expect(viewOf({ tab: 'done', selectedId: 's1', renamingId: null, confirm: null, offset: 2 })).toEqual({
      tab: 'done',
      selectedId: 's1',
      renamingId: null,
      confirm: null,
      offset: 2,
      folded: ['none'],
    })
  })

  test('a stored fold list is kept', async () => {
    expect(viewOf({ tab: 'active', selectedId: null, renamingId: null, confirm: null, offset: 0, folded: [] }).folded).toEqual([])
  })
})
