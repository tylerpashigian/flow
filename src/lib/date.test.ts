import { describe, expect, test } from 'vitest'
import {
  formatPlannerDay,
  formatPlannerLabel,
  formatPlannerMonthLabel,
  fromPlannerDayKey,
  parsePlannerDay,
  toPlannerDayKey,
} from './date'

describe('planner date helpers', () => {
  test('round-trips planner days as local calendar days', () => {
    const dayKey = toPlannerDayKey(new Date(2026, 3, 2, 15, 30))
    const roundTripped = fromPlannerDayKey(dayKey)

    expect(formatPlannerDay(dayKey)).toBe('2026-04-02')
    expect(roundTripped.getFullYear()).toBe(2026)
    expect(roundTripped.getMonth()).toBe(3)
    expect(roundTripped.getDate()).toBe(2)
  })

  test('formats planner labels from local date parts', () => {
    const dayKey = parsePlannerDay('2026-04-02')

    expect(dayKey).not.toBeNull()
    expect(formatPlannerLabel(dayKey!)).toBe('Thu, Apr 2')
    expect(formatPlannerMonthLabel(dayKey!)).toBe('Apr 2026')
  })

  test('rejects invalid ISO calendar days', () => {
    expect(parsePlannerDay('2026-02-30')).toBeNull()
  })
})
