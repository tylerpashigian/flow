import { describe, expect, test } from 'vitest'
import {
  getBoardWindowInputFromQueryKey,
  normalizeBoardWindowInput,
  plannerQueryKeys,
} from './query-keys'

describe('planner query keys', () => {
  test('normalizeBoardWindowInput normalizes date and segmentIds ordering', () => {
    const normalized = normalizeBoardWindowInput({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_2', 'segment_1', 'segment_1'],
    })

    expect(normalized.windowStartUtc).toBe('2026-04-01T00:00:00.000Z')
    expect(normalized.segmentIds).toEqual(['segment_1', 'segment_2'])
  })

  test('plannerQueryKeys.board uses normalized payload', () => {
    const key = plannerQueryKeys.board({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_2', 'segment_1'],
    })

    expect(key[0]).toBe('planner')
    expect(key[1]).toBe('board')
    expect(key[2]).toBe('snapshotByWindow')
    expect(key[3]).toEqual({
      planId: 'plan_1',
      windowStartUtc: '2026-04-01T00:00:00.000Z',
      windowEndUtc: '2026-04-10T00:00:00.000Z',
      segmentIds: ['segment_1', 'segment_2'],
    })
  })

  test('getBoardWindowInputFromQueryKey extracts normalized board input from board key', () => {
    const key = plannerQueryKeys.board({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_1'],
    })

    expect(getBoardWindowInputFromQueryKey(key)).toEqual({
      planId: 'plan_1',
      windowStartUtc: '2026-04-01T00:00:00.000Z',
      windowEndUtc: '2026-04-10T00:00:00.000Z',
      segmentIds: ['segment_1'],
    })
  })

  test('getBoardWindowInputFromQueryKey returns undefined for non-board keys', () => {
    expect(getBoardWindowInputFromQueryKey(plannerQueryKeys.all())).toBeUndefined()
    expect(
      getBoardWindowInputFromQueryKey([
        'planner',
        'board',
        'snapshotByWindow',
        { planId: 'plan_1' },
      ]),
    ).toBeUndefined()
  })
})
