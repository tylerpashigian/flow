import { describe, expect, test } from 'vitest'
import {
  toCreateResourceInput,
  toResourceFormModel,
  toUpdateResourceInput,
} from './conversions'

describe('planner resource conversions', () => {
  test('create form converts to service dto', () => {
    const result = toCreateResourceInput(
      {
        name: '  John Appleseed  ',
      },
      'plan_1',
    )

    expect(result).toEqual({
      planId: 'plan_1',
      name: 'John Appleseed',
    })
  })

  test('entity model converts to edit form model', () => {
    expect(
      toResourceFormModel({
        id: 'resource_1',
        planId: 'plan_1',
        userId: null,
        name: 'Alex',
        picture: null,
        capacityPercent: 100,
        timezone: 'UTC',
        workdayStartMinuteLocal: 0,
        workdayEndMinuteLocal: 1440,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ).toEqual({ name: 'Alex' })
  })

  test('update conversion produces update dto payload', () => {
    expect(toUpdateResourceInput({ name: ' Alex ' }, 'resource_1')).toEqual({
      id: 'resource_1',
      name: 'Alex',
    })
  })
})
