import { describe, expect, test } from 'vitest'
import type {
  PlannerBoardSnapshotDto,
  TaskAssignmentDto,
} from '#/integrations/trpc/planner/schemas'
import { toBoardSnapshotModel, toTaskAssignmentModel } from './conversions'

describe('planner board conversions', () => {
  test('toBoardSnapshotModel converts snapshot dto to canonical model', () => {
    const dto: PlannerBoardSnapshotDto = {
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
          taskProgressPercent: 50,
          projectedEndUtc: new Date('2026-04-07T00:00:00.000Z'),
          projectedDurationDays: 6,
          scheduleVarianceDays: 3,
          assignees: [
            {
              resourceId: 'resource_1',
              resourceName: 'Resource 1',
              resourcePicture: null,
              progressPercent: 50,
            },
          ],
        },
      ],
      dependencies: [
        {
          id: 'dep_1',
          predecessorTaskId: 'task_1',
          successorTaskId: 'task_2',
          type: 'FINISH_TO_START',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      conflicts: [
        {
          conflictType: 'TASK_OVERLAP',
          resourceId: 'resource_1',
          taskAId: 'task_1',
          taskBId: 'task_2',
          overlapStartUtc: new Date('2026-04-02T00:00:00.000Z'),
          overlapEndUtc: new Date('2026-04-03T00:00:00.000Z'),
          reason: null,
        },
      ],
      resources: [
        {
          id: 'resource_1',
          planId: 'plan_1',
          userId: null,
          name: 'Resource 1',
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

    const model = toBoardSnapshotModel(dto)
    const assignees = model.tasks[0].assignees ?? []

    expect(model.plan.id).toBe('plan_1')
    expect(model.tasks).toHaveLength(1)
    expect(assignees[0]?.resourceId).toBe('resource_1')
    expect(model.dependencies).toHaveLength(1)
    expect(model.conflicts).toHaveLength(1)
    expect(model.resources[0].picture).toBeNull()
    expect(model.segments[0].name).toBe('Sprint 1')
  })

  test('toTaskAssignmentModel handles optional/null-safe fields', () => {
    const dto: TaskAssignmentDto = {
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 0,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    }

    const model = toTaskAssignmentModel(dto)

    expect(model.progressPercent).toBe(0)
    expect(model.taskId).toBe('task_1')
  })
})
