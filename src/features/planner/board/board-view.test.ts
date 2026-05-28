import { describe, expect, test } from 'vitest'
import type { BoardSnapshotModel } from '#/data/planner'
import type { PlannerTaskRelations } from '@/features/planner/hooks'
import {
  buildPlannerBoardRows,
  getTaskColumnSpan,
  getTaskStartColumn,
} from './board-view'

function createSnapshot(): BoardSnapshotModel {
  return {
    plan: {
      id: 'plan_1',
      name: 'Plan 1',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    window: {
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
    },
    tasks: [
      {
        id: 'task_assigned',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'Assigned task',
        color: 'BLUE',
        startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
        durationDays: 3,
        estimatedEffortDays: null,
        endDayUtc: new Date('2026-04-05T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        taskProgressPercent: 60,
        assignees: [
          {
            resourceId: 'resource_1',
            resourceName: 'Alex',
            resourcePicture: null,
            progressPercent: 60,
          },
        ],
      },
      {
        id: 'task_unassigned',
        planId: 'plan_1',
        segmentId: null,
        name: 'Unassigned task',
        color: 'GREEN',
        startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
        durationDays: 2,
        estimatedEffortDays: null,
        endDayUtc: new Date('2026-04-05T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        taskProgressPercent: 0,
        assignees: [],
      },
    ],
    dependencies: [],
    conflicts: [],
    resources: [
      {
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
      },
    ],
    segments: [
      {
        id: 'segment_1',
        planId: 'plan_1',
        name: 'Sprint 1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ],
  }
}

const relations: PlannerTaskRelations = {
  dependenciesByTaskId: {},
  conflictsByTaskId: {
    task_assigned: [
      {
        conflictType: 'TASK_OVERLAP',
        resourceId: 'resource_1',
        taskAId: 'task_assigned',
        taskBId: 'task_other',
        overlapStartUtc: new Date('2026-04-02T00:00:00.000Z'),
        overlapEndUtc: new Date('2026-04-03T00:00:00.000Z'),
        reason: null,
      },
    ],
    task_unassigned: [],
  },
}

describe('planner board view', () => {
  test('groups tasks into resource rows with unassigned first', () => {
    const rows = buildPlannerBoardRows(createSnapshot(), relations, {
      renderedWindowStartDayKey: 20543,
    })

    expect(rows[0]?.label).toBe('Unassigned')
    expect(rows[0]?.tasks[0]?.title).toBe('Unassigned task')
    expect(rows[1]?.label).toBe('Alex')
    expect(rows[1]?.tasks[0]?.title).toBe('Assigned task')
  })

  test('computes task start column and span from start day and duration', () => {
    expect(getTaskStartColumn(20545, 20543)).toBe(3)
    expect(getTaskColumnSpan(3)).toBe(3)
  })

  test('maps viewer-local task metadata onto the row card model', () => {
    const rows = buildPlannerBoardRows(createSnapshot(), relations, {
      renderedWindowStartDayKey: 20543,
    })
    const assignedTask = rows[1].tasks[0]

    expect(assignedTask.segmentName).toBe('Sprint 1')
    expect(assignedTask.assigneeName).toBe('Alex')
    expect(assignedTask.progressPercent).toBe(60)
    expect(assignedTask.conflictCount).toBe(1)
  })

  test('assigns logical row and lane layout defaults', () => {
    const rows = buildPlannerBoardRows(createSnapshot(), relations, {
      renderedWindowStartDayKey: 20543,
    })

    rows.forEach((row, rowIndex) => {
      expect(row.rowIndex).toBe(rowIndex)
      expect(row.laneCount).toBe(1)
      row.tasks.forEach((task) => {
        expect(task.laneIndex).toBe(0)
      })
    })

    expect(rows[0].tasks[0].startColumn).toBe(4)
    expect(rows[0].tasks[0].durationDays).toBe(2)
    expect(rows[1].tasks[0].startColumn).toBe(3)
    expect(rows[1].tasks[0].durationDays).toBe(3)
  })

  test('sorts same-day tasks deterministically', () => {
    const snapshot = createSnapshot()
    snapshot.tasks.push({
      id: 'task_same_day_alpha',
      planId: 'plan_1',
      segmentId: null,
      name: 'Alpha same-day task',
      color: 'SLATE',
      startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      durationDays: 1,
      estimatedEffortDays: null,
      endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      taskProgressPercent: undefined,
      assignees: [],
    })

    const rows = buildPlannerBoardRows(
      snapshot,
      {
        ...relations,
        conflictsByTaskId: {
          ...relations.conflictsByTaskId,
          task_same_day_alpha: [],
        },
      },
      {
        renderedWindowStartDayKey: 20543,
      },
    )

    expect(rows[0].tasks.map((task) => task.title)).toEqual([
      'Alpha same-day task',
      'Unassigned task',
    ])
  })

  test('assigns different lanes to overlapping tasks and reuses lanes for non-overlapping tasks', () => {
    const snapshot = createSnapshot()
    snapshot.tasks.push(
      {
        id: 'task_overlap',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'Overlap task',
        color: 'AMBER',
        startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
        durationDays: 3,
        estimatedEffortDays: null,
        endDayUtc: new Date('2026-04-06T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        taskProgressPercent: undefined,
        assignees: [
          {
            resourceId: 'resource_1',
            resourceName: 'Alex',
            resourcePicture: null,
            progressPercent: 0,
          },
        ],
      },
      {
        id: 'task_after_overlap',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'After overlap',
        color: 'GREEN',
        startDayUtc: new Date('2026-04-06T00:00:00.000Z'),
        durationDays: 1,
        estimatedEffortDays: null,
        endDayUtc: new Date('2026-04-07T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        taskProgressPercent: undefined,
        assignees: [
          {
            resourceId: 'resource_1',
            resourceName: 'Alex',
            resourcePicture: null,
            progressPercent: 0,
          },
        ],
      },
    )

    const rows = buildPlannerBoardRows(
      snapshot,
      {
        ...relations,
        conflictsByTaskId: {
          ...relations.conflictsByTaskId,
          task_overlap: [],
          task_after_overlap: [],
        },
      },
      {
        renderedWindowStartDayKey: 20543,
      },
    )

    const resourceRow = rows[1]
    const assignedTask = resourceRow.tasks.find(
      (task) => task.id === 'task_assigned',
    )
    const overlapTask = resourceRow.tasks.find(
      (task) => task.id === 'task_overlap',
    )
    const afterOverlapTask = resourceRow.tasks.find(
      (task) => task.id === 'task_after_overlap',
    )

    expect(resourceRow.laneCount).toBe(2)
    expect(assignedTask?.laneIndex).toBe(0)
    expect(overlapTask?.laneIndex).toBe(1)
    expect(afterOverlapTask?.laneIndex).toBe(0)
  })
})
