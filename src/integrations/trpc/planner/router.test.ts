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
    })

    expect(created.startDayUtc.toISOString()).toBe('2026-03-31T00:00:00.000Z')
    expect(created.endDayUtc.toISOString()).toBe('2026-04-03T00:00:00.000Z')
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
})
