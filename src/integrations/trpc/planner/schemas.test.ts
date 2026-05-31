import { describe, expect, test } from 'vitest'
import {
  BoardSnapshotByWindowInputSchema,
  CreateResourceInputSchema,
  CreateTaskInputSchema,
  ListByPlanWindowInputSchema,
  PlannerConflictSchema,
  UpdateSegmentInputSchema,
  UpdateTaskAssignmentProgressInputSchema,
} from './schemas'

describe('planner schema contracts', () => {
  test('createTaskInputSchema accepts valid payload', () => {
    const parsed = CreateTaskInputSchema.parse({
      planId: 'plan_1',
      segmentId: null,
      name: 'Task A',
      color: 'BLUE',
      startUtc: '2026-03-31T00:00:00.000Z',
      durationDays: 2,
    })

    expect(parsed.startUtc).toBeInstanceOf(Date)
  })

  test('createTaskInputSchema rejects invalid duration', () => {
    expect(() =>
      CreateTaskInputSchema.parse({
        planId: 'plan_1',
        name: 'Task A',
        color: 'BLUE',
        startUtc: '2026-03-31T00:00:00.000Z',
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

  test('BoardSnapshotByWindowInputSchema parses optional segmentIds', () => {
    const parsed = BoardSnapshotByWindowInputSchema.parse({
      planId: 'plan_1',
      windowStartUtc: '2026-03-31T00:00:00.000Z',
      windowEndUtc: '2026-04-06T00:00:00.000Z',
      segmentIds: ['segment_1', 'segment_2'],
    })

    expect(parsed.segmentIds).toEqual(['segment_1', 'segment_2'])
    expect(parsed.windowStartUtc).toBeInstanceOf(Date)
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

  test('CreateResourceInputSchema rejects invalid work window', () => {
    expect(() =>
      CreateResourceInputSchema.parse({
        planId: 'plan_1',
        name: 'Resource',
        capacityPercent: 50,
        timezone: 'America/Chicago',
        workdayStartMinuteLocal: 600,
        workdayEndMinuteLocal: 300,
      }),
    ).toThrow()
  })

  test('UpdateTaskAssignmentProgressInputSchema validates progress range', () => {
    expect(() =>
      UpdateTaskAssignmentProgressInputSchema.parse({
        taskId: 'task_1',
        resourceId: 'resource_1',
        progressPercent: 101,
      }),
    ).toThrow()
  })

  test('UpdateSegmentInputSchema requires a trimmed name', () => {
    expect(() =>
      UpdateSegmentInputSchema.parse({
        id: 'segment_1',
        name: '   ',
      }),
    ).toThrow()
  })
})
