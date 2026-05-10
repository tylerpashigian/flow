import { describe, expect, test } from 'vitest'
import {
  toCreateSegmentInput,
  toSegmentFormModel,
  toUpdateSegmentInput,
} from './conversions'

describe('planner segment conversions', () => {
  test('create form converts to service dto', () => {
    const result = toCreateSegmentInput(
      {
        name: '  Sprint 15  ',
      },
      'plan_1',
    )

    expect(result).toEqual({
      planId: 'plan_1',
      name: 'Sprint 15',
    })
  })

  test('entity model converts to edit form model', () => {
    expect(
      toSegmentFormModel({
        id: 'segment_1',
        planId: 'plan_1',
        name: 'Sprint 15',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ).toEqual({ name: 'Sprint 15' })
  })

  test('update conversion produces update dto payload', () => {
    expect(toUpdateSegmentInput({ name: ' Sprint 16 ' }, 'segment_1')).toEqual({
      id: 'segment_1',
      name: 'Sprint 16',
    })
  })
})
