import { describe, expect, test } from 'vitest'
import {
  createDefaultTaskFormModel,
  DEFAULT_TASK_COLOR,
  toCreateTaskInput,
  toOptionalTaskAssignmentInput,
  toTaskFormModel,
  toTaskModelFromTask,
  toUpdateTaskInput,
} from './conversions'

describe('planner task conversions', () => {
  test('create form converts start date, duration, and optional fields', () => {
    const result = toCreateTaskInput(
      {
        title: '  Define timeline data model  ',
        startDate: new Date(2026, 3, 2, 15, 30),
        durationDays: '3',
        segmentId: 'segment_1',
        resourceId: 'resource_1',
      },
      'plan_1',
    )

    expect(result).toEqual({
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Define timeline data model',
      color: DEFAULT_TASK_COLOR,
      startUtc: new Date(2026, 3, 2),
      durationDays: 3,
    })
  })

  test('optional resource selection converts to follow-up assignment input', () => {
    expect(
      toOptionalTaskAssignmentInput(
        {
          title: 'Task',
          startDate: new Date('2026-04-02T00:00:00.000Z'),
          durationDays: '2',
          segmentId: undefined,
          resourceId: 'resource_1',
        },
        'task_1',
      ),
    ).toEqual({
      taskId: 'task_1',
      resourceId: 'resource_1',
    })
  })

  test('empty optional resource selection returns null assignment input', () => {
    expect(
      toOptionalTaskAssignmentInput(
        {
          title: 'Task',
          startDate: new Date('2026-04-02T00:00:00.000Z'),
          durationDays: '2',
          segmentId: undefined,
          resourceId: undefined,
        },
        'task_1',
      ),
    ).toBeNull()
  })

  test('entity model converts to edit form model', () => {
    expect(
      toTaskFormModel({
        id: 'task_1',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'Task',
        color: 'BLUE',
        startUtc: new Date('2026-04-02T00:00:00.000Z'),
        durationDays: 2,
        estimatedEffortDays: null,
        endUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        assignees: [
          {
            resourceId: 'resource_1',
            resourceName: 'Alex',
            resourcePicture: null,
            progressPercent: 0,
          },
        ],
      }),
    ).toEqual({
      title: 'Task',
      startDate: new Date('2026-04-02T00:00:00.000Z'),
      durationDays: '2',
      segmentId: 'segment_1',
      resourceId: 'resource_1',
    })
  })

  test('update conversion produces update dto payload', () => {
    expect(
      toUpdateTaskInput(
        {
          ...createDefaultTaskFormModel(new Date(2026, 3, 2)),
          title: ' Updated task ',
          durationDays: '4',
          segmentId: 'segment_1',
        },
        'task_1',
      ),
    ).toEqual({
      id: 'task_1',
      segmentId: 'segment_1',
      name: 'Updated task',
      color: DEFAULT_TASK_COLOR,
      startUtc: new Date(2026, 3, 2),
      durationDays: 4,
    })
  })

  test('toTaskModelFromTask maps task write dto without derived fields', () => {
    const model = toTaskModelFromTask({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: null,
      name: 'Task 1',
      color: 'BLUE',
      startUtc: new Date('2026-04-01T00:00:00.000Z'),
      durationDays: 2,
      estimatedEffortDays: null,
      endUtc: new Date('2026-04-03T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    expect(model.id).toBe('task_1')
    expect(model.taskProgressPercent).toBeUndefined()
    expect(model.assignees).toBeUndefined()
  })
})
