import { describe, expect, test } from 'vitest'
import {
  CreateTaskInputSchema,
  ListByPlanWindowInputSchema,
  PlannerConflictSchema,
} from './schemas'

describe('planner schema contracts', () => {
  test('createTaskInputSchema accepts valid payload', () => {
    const parsed = CreateTaskInputSchema.parse({
      planId: 'plan_1',
      segmentId: null,
      name: 'Task A',
      color: 'BLUE',
      startDayUtc: '2026-03-31T00:00:00.000Z',
      durationDays: 2,
    })

    expect(parsed.startDayUtc).toBeInstanceOf(Date)
  })

  test('createTaskInputSchema rejects invalid duration', () => {
    expect(() =>
      CreateTaskInputSchema.parse({
        planId: 'plan_1',
        name: 'Task A',
        color: 'BLUE',
        startDayUtc: '2026-03-31T00:00:00.000Z',
        durationDays: 0,
      }),
    ).toThrow()
  })

  test('listByPlanWindowInputSchema parses window values to dates', () => {
    const parsed = ListByPlanWindowInputSchema.parse({
      planId: 'plan_1',
      windowStartUtc: '2026-03-31T00:00:00.000Z',
      windowEndUtc: '2026-04-06T00:00:00.000Z',
    })

    expect(parsed.windowStartUtc).toBeInstanceOf(Date)
    expect(parsed.windowEndUtc).toBeInstanceOf(Date)
  })

  test('plannerConflictSchema validates required conflict fields', () => {
    const parsed = PlannerConflictSchema.parse({
      conflictType: 'TASK_OVERLAP',
      resourceId: 'resource_1',
      taskAId: 'task_1',
      taskBId: 'task_2',
      overlapStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      overlapEndUtc: new Date('2026-04-02T00:00:00.000Z'),
      reason: null,
    })

    expect(parsed.conflictType).toBe('TASK_OVERLAP')
  })
})
