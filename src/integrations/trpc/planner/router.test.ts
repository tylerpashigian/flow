import { beforeEach, describe, expect, test, vi } from 'vitest'

const prismaMock = {
  plan: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  segment: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  resource: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  task: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  taskAssignment: {
    delete: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  taskDependency: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  resourceUnavailability: {
    findMany: vi.fn(),
  },
}

vi.mock('#/db', () => ({
  prisma: prismaMock,
}))

const { plannerRouter } = await import('./router')

describe('planner router behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('tasks.create computes endDayUtc from start + duration', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      id: 'plan_1',
      name: 'Plan',
    })
    prismaMock.task.create.mockImplementation(async ({ data }) => ({
      id: 'task_1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      ...data,
    }))

    const caller = plannerRouter.createCaller({})
    const created = await caller.tasks.create({
      planId: 'plan_1',
      name: 'Task A',
      color: 'BLUE',
      startDayUtc: new Date('2026-03-31T08:00:00.000Z'),
      durationDays: 3,
      estimatedEffortDays: 4,
    })

    expect(created.startDayUtc.toISOString()).toBe('2026-03-31T00:00:00.000Z')
    expect(created.endDayUtc.toISOString()).toBe('2026-04-03T00:00:00.000Z')
    expect(created.estimatedEffortDays).toBe(4)
  })

  test('assignments.add rejects cross-plan task/resource pairs', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
    })
    prismaMock.resource.findUnique.mockResolvedValueOnce({
      id: 'resource_1',
      planId: 'plan_2',
    })

    const caller = plannerRouter.createCaller({})

    await expect(
      caller.assignments.add({
        taskId: 'task_1',
        resourceId: 'resource_1',
      }),
    ).rejects.toThrow('Task and resource must belong to the same plan')
  })

  test('dependencies.add rejects cycles', async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce({ id: 'task_1', planId: 'plan_1' })
      .mockResolvedValueOnce({ id: 'task_2', planId: 'plan_1' })
    prismaMock.taskDependency.findMany.mockResolvedValueOnce([
      { predecessorTaskId: 'task_2', successorTaskId: 'task_1' },
    ])

    const caller = plannerRouter.createCaller({})

    await expect(
      caller.dependencies.add({
        predecessorTaskId: 'task_1',
        successorTaskId: 'task_2',
        type: 'FINISH_TO_START',
      }),
    ).rejects.toThrow('Dependency would create a cycle')
  })

  test('conflicts.listByWindow returns overlap conflicts', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
    })
    prismaMock.taskAssignment.findMany.mockResolvedValueOnce([
      {
        resourceId: 'resource_1',
        task: {
          id: 'task_1',
          startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-03T00:00:00.000Z'),
        },
      },
      {
        resourceId: 'resource_1',
        task: {
          id: 'task_2',
          startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        },
      },
    ])
    prismaMock.resourceUnavailability.findMany.mockResolvedValueOnce([])

    const caller = plannerRouter.createCaller({})
    const conflicts = await caller.conflicts.listByWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-06T00:00:00.000Z'),
    })

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      conflictType: 'TASK_OVERLAP',
      resourceId: 'resource_1',
      taskAId: 'task_1',
      taskBId: 'task_2',
    })
  })

  test('assignments.updateProgress persists progressPercent', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
    })
    prismaMock.resource.findUnique.mockResolvedValueOnce({
      id: 'resource_1',
      planId: 'plan_1',
    })
    prismaMock.taskAssignment.update.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 70,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const caller = plannerRouter.createCaller({})
    const assignment = await caller.assignments.updateProgress({
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 70,
    })

    expect(assignment.progressPercent).toBe(70)
  })

  test('tasks.listByPlanWindow returns derived progress and projection', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
    })
    prismaMock.task.findMany.mockResolvedValueOnce([
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
              picture: 'https://example.com/resource-1.png',
              capacityPercent: 50,
              workdayStartMinuteLocal: 0,
              workdayEndMinuteLocal: 1440,
            },
          },
        ],
      },
    ])

    const caller = plannerRouter.createCaller({})
    const tasks = await caller.tasks.listByPlanWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
    })

    expect(tasks).toHaveLength(1)
    expect(tasks[0].taskProgressPercent).toBe(50)
    expect(tasks[0].projectedDurationDays).toBe(6)
    expect(tasks[0].scheduleVarianceDays).toBe(3)
    expect(tasks[0].projectedEndUtc.toISOString()).toBe(
      '2026-04-07T00:00:00.000Z',
    )
    expect(tasks[0].assignees).toEqual([
      {
        resourceId: 'resource_1',
        resourceName: 'Resource 1',
        resourcePicture: 'https://example.com/resource-1.png',
        progressPercent: 50,
      },
    ])
  })

  test('tasks.listByPlanWindow projection respects a 4-hour work window', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
    })
    prismaMock.task.findMany.mockResolvedValueOnce([
      {
        id: 'task_2',
        planId: 'plan_1',
        segmentId: null,
        name: 'Task 2',
        color: 'GREEN',
        startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
        durationDays: 3,
        estimatedEffortDays: 3,
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        assignments: [
          {
            progressPercent: 20,
            resource: {
              id: 'resource_2',
              name: 'Resource 2',
              picture: null,
              capacityPercent: 100,
              workdayStartMinuteLocal: 540,
              workdayEndMinuteLocal: 780,
            },
          },
        ],
      },
    ])

    const caller = plannerRouter.createCaller({})
    const tasks = await caller.tasks.listByPlanWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
    })

    expect(tasks).toHaveLength(1)
    expect(tasks[0].taskProgressPercent).toBe(20)
    expect(tasks[0].projectedDurationDays).toBe(6)
    expect(tasks[0].scheduleVarianceDays).toBe(3)
    expect(tasks[0].projectedEndUtc.toISOString()).toBe(
      '2026-04-07T00:00:00.000Z',
    )
    expect(tasks[0].assignees).toEqual([
      {
        resourceId: 'resource_2',
        resourceName: 'Resource 2',
        resourcePicture: null,
        progressPercent: 20,
      },
    ])
  })

  test('tasks.listByPlanWindow maps invalid window to bad request error', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
    })

    const caller = plannerRouter.createCaller({})

    await expect(
      caller.tasks.listByPlanWindow({
        planId: 'plan_1',
        windowStartUtc: new Date('2026-04-10T00:00:00.000Z'),
        windowEndUtc: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow('windowEndUtc must be greater than windowStartUtc')
  })

  test('board.snapshotByWindow returns window-scoped entities with deterministic ordering', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-02T00:00:00.000Z'),
    })
    prismaMock.task.findMany.mockResolvedValueOnce([
      {
        id: 'task_1',
        planId: 'plan_1',
        segmentId: 'segment_1',
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
            progressPercent: 20,
            resource: {
              id: 'resource_2',
              name: 'Zoe',
              picture: null,
              capacityPercent: 100,
              workdayStartMinuteLocal: 540,
              workdayEndMinuteLocal: 1020,
            },
          },
        ],
      },
      {
        id: 'task_2',
        planId: 'plan_1',
        segmentId: null,
        name: 'Task 2',
        color: 'GREEN',
        startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
        durationDays: 2,
        estimatedEffortDays: 2,
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        assignments: [
          {
            progressPercent: 60,
            resource: {
              id: 'resource_1',
              name: 'Amy',
              picture: 'https://example.com/resource-1.png',
              capacityPercent: 50,
              workdayStartMinuteLocal: 0,
              workdayEndMinuteLocal: 1440,
            },
          },
        ],
      },
    ])
    prismaMock.taskDependency.findMany.mockResolvedValueOnce([
      {
        id: 'dep_1',
        predecessorTaskId: 'task_1',
        successorTaskId: 'task_2',
        type: 'FINISH_TO_START',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ])
    prismaMock.taskAssignment.findMany.mockResolvedValueOnce([
      {
        resourceId: 'resource_1',
        task: {
          id: 'task_1',
          startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-03T00:00:00.000Z'),
        },
      },
      {
        resourceId: 'resource_1',
        task: {
          id: 'task_2',
          startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
          endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        },
      },
    ])
    prismaMock.resourceUnavailability.findMany.mockResolvedValueOnce([])
    prismaMock.resource.findMany.mockResolvedValueOnce([
      {
        id: 'resource_1',
        planId: 'plan_1',
        userId: null,
        name: 'Amy',
        picture: 'https://example.com/resource-1.png',
        capacityPercent: 50,
        timezone: 'UTC',
        workdayStartMinuteLocal: 0,
        workdayEndMinuteLocal: 1440,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        id: 'resource_2',
        planId: 'plan_1',
        userId: null,
        name: 'Zoe',
        picture: null,
        capacityPercent: 100,
        timezone: 'UTC',
        workdayStartMinuteLocal: 540,
        workdayEndMinuteLocal: 1020,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ])
    prismaMock.segment.findMany.mockResolvedValueOnce([
      {
        id: 'segment_1',
        planId: 'plan_1',
        name: 'Sprint 1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ])

    const caller = plannerRouter.createCaller({})
    const snapshot = await caller.board.snapshotByWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
    })

    expect(snapshot.plan.id).toBe('plan_1')
    expect(snapshot.window.windowStartUtc.toISOString()).toBe(
      '2026-04-01T00:00:00.000Z',
    )
    expect(snapshot.tasks).toHaveLength(2)
    expect(snapshot.dependencies).toHaveLength(1)
    expect(snapshot.conflicts).toHaveLength(1)
    expect(snapshot.resources.map((resource) => resource.id)).toEqual([
      'resource_1',
      'resource_2',
    ])
    expect(snapshot.segments.map((segment) => segment.id)).toEqual(['segment_1'])
    expect(snapshot.tasks[0].assignees[0].resourceName).toBe('Zoe')

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ startDayUtc: 'asc' }, { createdAt: 'asc' }],
      }),
    )
    expect(prismaMock.taskDependency.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { predecessorTaskId: { in: ['task_1', 'task_2'] } },
            { successorTaskId: { in: ['task_1', 'task_2'] } },
          ],
        }),
        orderBy: { createdAt: 'asc' },
      }),
    )
    expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      }),
    )
    expect(prismaMock.segment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      }),
    )
  })

  test('board.snapshotByWindow applies optional segmentIds filter to task query', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-02T00:00:00.000Z'),
    })
    prismaMock.task.findMany.mockResolvedValueOnce([])
    prismaMock.taskAssignment.findMany.mockResolvedValueOnce([])
    prismaMock.resourceUnavailability.findMany.mockResolvedValueOnce([])

    const caller = plannerRouter.createCaller({})
    const snapshot = await caller.board.snapshotByWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_1', 'segment_2'],
    })

    expect(snapshot.tasks).toEqual([])
    expect(snapshot.dependencies).toEqual([])
    expect(snapshot.resources).toEqual([])
    expect(snapshot.segments).toEqual([])
    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          segmentId: { in: ['segment_1', 'segment_2'] },
        }),
      }),
    )
  })

  test('resources.create rejects invalid IANA timezone', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Plan',
    })

    const caller = plannerRouter.createCaller({})

    await expect(
      caller.resources.create({
        planId: 'plan_1',
        name: 'Resource 1',
        timezone: 'Invalid/Timezone',
      }),
    ).rejects.toThrow('Invalid timezone')
  })

  test('resources.update rejects invalid IANA timezone', async () => {
    prismaMock.resource.findUnique.mockResolvedValueOnce({
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
    })

    const caller = plannerRouter.createCaller({})

    await expect(
      caller.resources.update({
        id: 'resource_1',
        timezone: 'Mars/Olympus_Mons',
      }),
    ).rejects.toThrow('Invalid timezone')
  })
})
