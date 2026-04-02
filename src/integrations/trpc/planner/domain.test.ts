import { describe, expect, test } from 'vitest'
import {
  buildTaskOverlapConflicts,
  buildUnavailabilityConflicts,
  computeEndDayUtc,
  dedupeConflicts,
  wouldCreateDependencyCycle,
} from './domain'

describe('planner domain utilities', () => {
  test('computeEndDayUtc derives end from start + duration', () => {
    const end = computeEndDayUtc(new Date('2026-03-31T08:12:00.000Z'), 3)

    expect(end.toISOString()).toBe('2026-04-03T00:00:00.000Z')
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
})
