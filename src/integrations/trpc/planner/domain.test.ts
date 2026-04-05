import { describe, expect, test } from 'vitest'
import {
  assertWindow,
  buildTaskOverlapConflicts,
  buildUnavailabilityConflicts,
  computeProjectedSchedule,
  computeResourceDailyFte,
  computeEndDayUtc,
  dedupeConflicts,
  mapTaskToTaskRead,
  PlannerDomainValidationError,
  wouldCreateDependencyCycle,
} from './domain'

describe('planner domain utilities', () => {
  test('computeEndDayUtc derives end from start + duration', () => {
    const end = computeEndDayUtc(new Date('2026-03-31T08:12:00.000Z'), 3)

    expect(end.toISOString()).toBe('2026-04-03T00:00:00.000Z')
  })

  test('computeEndDayUtc throws domain validation error for invalid duration', () => {
    expect(() => computeEndDayUtc(new Date('2026-03-31T08:12:00.000Z'), 0))
      .toThrowError(PlannerDomainValidationError)
  })

  test('assertWindow throws domain validation error for invalid window', () => {
    expect(() =>
      assertWindow(
        new Date('2026-04-02T00:00:00.000Z'),
        new Date('2026-04-01T00:00:00.000Z'),
      ),
    ).toThrowError(PlannerDomainValidationError)
  })

  test('wouldCreateDependencyCycle returns true when cycle would form', () => {
    const edges = [
      { predecessorTaskId: 'a', successorTaskId: 'b' },
      { predecessorTaskId: 'b', successorTaskId: 'c' },
    ]

    expect(wouldCreateDependencyCycle(edges, 'c', 'a')).toBe(true)
    expect(wouldCreateDependencyCycle(edges, 'c', 'd')).toBe(false)
  })

  test('buildTaskOverlapConflicts returns overlap by resource', () => {
    const conflicts = buildTaskOverlapConflicts([
      {
        id: 't1',
        resourceId: 'r1',
        startDayUtc: new Date('2026-03-31T00:00:00.000Z'),
        endDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      },
      {
        id: 't2',
        resourceId: 'r1',
        startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
      },
    ])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      conflictType: 'TASK_OVERLAP',
      resourceId: 'r1',
      taskAId: 't1',
      taskBId: 't2',
    })
  })

  test('buildUnavailabilityConflicts returns overlap windows', () => {
    const conflicts = buildUnavailabilityConflicts(
      [
        {
          id: 't1',
          resourceId: 'r1',
          startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-05T00:00:00.000Z'),
        },
      ],
      [
        {
          resourceId: 'r1',
          startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
          reason: 'PTO',
        },
      ],
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      conflictType: 'RESOURCE_UNAVAILABLE',
      resourceId: 'r1',
      taskAId: 't1',
      reason: 'PTO',
    })
  })

  test('dedupeConflicts removes duplicate conflict records', () => {
    const duplicate = {
      conflictType: 'TASK_OVERLAP' as const,
      resourceId: 'r1',
      taskAId: 't1',
      taskBId: 't2',
      overlapStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      overlapEndUtc: new Date('2026-04-02T00:00:00.000Z'),
      reason: null,
    }

    expect(dedupeConflicts([duplicate, duplicate])).toHaveLength(1)
  })

  test('computeResourceDailyFte applies work window and capacity', () => {
    const fullWindowAtHalfCapacity = computeResourceDailyFte(0, 1440, 50, 480)
    const fourHourAtFullCapacity = computeResourceDailyFte(540, 780, 100, 480)

    expect(fullWindowAtHalfCapacity).toBe(0.5)
    expect(fourHourAtFullCapacity).toBe(0.5)
  })

  test('computeProjectedSchedule returns planned values when no assignments exist', () => {
    const start = new Date('2026-04-01T00:00:00.000Z')
    const projection = computeProjectedSchedule(start, 3, 5, [], 480)

    expect(projection.taskProgressPercent).toBe(0)
    expect(projection.projectedDurationDays).toBe(3)
    expect(projection.scheduleVarianceDays).toBe(0)
    expect(projection.projectedEndUtc.toISOString()).toBe(
      '2026-04-04T00:00:00.000Z',
    )
  })

  test('computeProjectedSchedule derives projection and task progress from assignments', () => {
    const start = new Date('2026-04-01T00:00:00.000Z')
    const projection = computeProjectedSchedule(
      start,
      3,
      3,
      [
        {
          progressPercent: 20,
          resource: {
            capacityPercent: 50,
            workdayStartMinuteLocal: 0,
            workdayEndMinuteLocal: 1440,
          },
        },
        {
          progressPercent: 60,
          resource: {
            capacityPercent: 100,
            workdayStartMinuteLocal: 540,
            workdayEndMinuteLocal: 780,
          },
        },
      ],
      480,
    )

    expect(projection.taskProgressPercent).toBe(40)
    expect(projection.projectedDurationDays).toBe(3)
    expect(projection.scheduleVarianceDays).toBe(0)
    expect(projection.projectedEndUtc.toISOString()).toBe(
      '2026-04-04T00:00:00.000Z',
    )
  })

  test('mapTaskToTaskRead maps assignees and derived fields', () => {
    const taskRead = mapTaskToTaskRead(
      {
        id: 'task_1',
        planId: 'plan_1',
        segmentId: null,
        name: 'Task 1',
        color: 'BLUE',
        startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
        durationDays: 3,
        estimatedEffortDays: 3,
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        assignments: [
          {
            progressPercent: 50,
            resource: {
              id: 'resource_1',
              name: 'Resource 1',
              picture: null,
              capacityPercent: 50,
              workdayStartMinuteLocal: 0,
              workdayEndMinuteLocal: 1440,
            },
          },
        ],
      },
      480,
    )

    expect(taskRead.taskProgressPercent).toBe(50)
    expect(taskRead.projectedDurationDays).toBe(6)
    expect(taskRead.scheduleVarianceDays).toBe(3)
    expect(taskRead.assignees).toEqual([
      {
        resourceId: 'resource_1',
        resourceName: 'Resource 1',
        resourcePicture: null,
        progressPercent: 50,
      },
    ])
  })
})
