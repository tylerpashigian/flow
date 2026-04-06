import { beforeEach, describe, expect, test, vi } from 'vitest'

const snapshotByWindowQueryMock = vi.fn()
const createTaskMutateMock = vi.fn()
const updateTaskMutateMock = vi.fn()
const addAssignmentMutateMock = vi.fn()
const updateAssignmentProgressMutateMock = vi.fn()
const removeAssignmentMutateMock = vi.fn()
const addDependencyMutateMock = vi.fn()
const removeDependencyMutateMock = vi.fn()

vi.mock('#/integrations/trpc/client', () => ({
  trpcClient: {
    planner: {
      board: { snapshotByWindow: { query: snapshotByWindowQueryMock } },
      tasks: {
        create: { mutate: createTaskMutateMock },
        update: { mutate: updateTaskMutateMock },
      },
      assignments: {
        add: { mutate: addAssignmentMutateMock },
        updateProgress: { mutate: updateAssignmentProgressMutateMock },
        remove: { mutate: removeAssignmentMutateMock },
      },
      dependencies: {
        add: { mutate: addDependencyMutateMock },
        remove: { mutate: removeDependencyMutateMock },
      },
    },
  },
}))

const { plannerService } = await import('./service')

describe('planner service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('getBoardSnapshotByWindow passes segmentIds and returns canonical model', async () => {
    snapshotByWindowQueryMock.mockResolvedValueOnce({
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
      tasks: [],
      dependencies: [],
      conflicts: [],
      resources: [],
      segments: [],
    })

    const result = await plannerService.getBoardSnapshotByWindow({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_1'],
    })

    expect(snapshotByWindowQueryMock).toHaveBeenCalledWith({
      planId: 'plan_1',
      windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
      windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      segmentIds: ['segment_1'],
    })
    expect(result.plan.id).toBe('plan_1')
  })

  test('getBoardSnapshotByWindow throws when response shape is invalid', async () => {
    snapshotByWindowQueryMock.mockResolvedValueOnce({
      window: {
        windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
        windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      },
      tasks: [],
      dependencies: [],
      conflicts: [],
      resources: [],
      segments: [],
    })

    await expect(
      plannerService.getBoardSnapshotByWindow({
        planId: 'plan_1',
        windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
        windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
      }),
    ).rejects.toThrow()
  })

  test('updateAssignmentProgress parses and returns assignment model', async () => {
    updateAssignmentProgressMutateMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 80,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const result = await plannerService.updateAssignmentProgress({
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 80,
    })

    expect(result.progressPercent).toBe(80)
    expect(updateAssignmentProgressMutateMock).toHaveBeenCalledWith({
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 80,
    })
  })

  test('createTask parses and returns task model', async () => {
    createTaskMutateMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: null,
      name: 'Task 1',
      color: 'BLUE',
      startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
      durationDays: 2,
      estimatedEffortDays: null,
      endDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    const result = await plannerService.createTask({
      planId: 'plan_1',
      segmentId: null,
      name: 'Task 1',
      color: 'BLUE',
      startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
      durationDays: 2,
    })

    expect(result.id).toBe('task_1')
    expect(createTaskMutateMock).toHaveBeenCalledWith({
      planId: 'plan_1',
      segmentId: null,
      name: 'Task 1',
      color: 'BLUE',
      startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
      durationDays: 2,
    })
  })

  test('updateTask parses and returns task model', async () => {
    updateTaskMutateMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Task 1 Updated',
      color: 'GREEN',
      startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
      durationDays: 3,
      estimatedEffortDays: 2,
      endDayUtc: new Date('2026-04-05T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const result = await plannerService.updateTask({
      id: 'task_1',
      name: 'Task 1 Updated',
      color: 'GREEN',
    })

    expect(result.name).toBe('Task 1 Updated')
    expect(updateTaskMutateMock).toHaveBeenCalledWith({
      id: 'task_1',
      name: 'Task 1 Updated',
      color: 'GREEN',
    })
  })

  test('addAssignment parses and returns assignment model', async () => {
    addAssignmentMutateMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 10,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    const result = await plannerService.addAssignment({
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 10,
    })

    expect(result.progressPercent).toBe(10)
    expect(addAssignmentMutateMock).toHaveBeenCalledWith({
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 10,
    })
  })

  test('removeAssignment parses and returns assignment model', async () => {
    removeAssignmentMutateMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 25,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const result = await plannerService.removeAssignment({
      taskId: 'task_1',
      resourceId: 'resource_1',
    })

    expect(result.taskId).toBe('task_1')
    expect(removeAssignmentMutateMock).toHaveBeenCalledWith({
      taskId: 'task_1',
      resourceId: 'resource_1',
    })
  })

  test('addDependency parses and returns dependency model', async () => {
    addDependencyMutateMock.mockResolvedValueOnce({
      id: 'dependency_1',
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    const result = await plannerService.addDependency({
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
      type: 'FINISH_TO_START',
    })

    expect(result.id).toBe('dependency_1')
    expect(addDependencyMutateMock).toHaveBeenCalledWith({
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
      type: 'FINISH_TO_START',
    })
  })

  test('removeDependency parses and returns dependency model', async () => {
    removeDependencyMutateMock.mockResolvedValueOnce({
      id: 'dependency_1',
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    const result = await plannerService.removeDependency({
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
    })

    expect(result.successorTaskId).toBe('task_2')
    expect(removeDependencyMutateMock).toHaveBeenCalledWith({
      predecessorTaskId: 'task_1',
      successorTaskId: 'task_2',
    })
  })
})
