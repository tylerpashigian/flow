// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { usePlannerBoard } from './hooks'
import { plannerQueryKeys } from './query-keys'
import type { BoardSnapshotModel, TaskModel } from './models'

const {
  getBoardSnapshotByWindowMock,
  updateTaskMock,
  addAssignmentMock,
  updateAssignmentProgressMock,
  removeAssignmentMock,
  addDependencyMock,
  removeDependencyMock,
} = vi.hoisted(() => ({
  getBoardSnapshotByWindowMock: vi.fn(),
  updateTaskMock: vi.fn(),
  addAssignmentMock: vi.fn(),
  updateAssignmentProgressMock: vi.fn(),
  removeAssignmentMock: vi.fn(),
  addDependencyMock: vi.fn(),
  removeDependencyMock: vi.fn(),
}))

vi.mock('./service', () => ({
  plannerService: {
    getBoardSnapshotByWindow: getBoardSnapshotByWindowMock,
    createTask: vi.fn(),
    updateTask: updateTaskMock,
    addAssignment: addAssignmentMock,
    updateAssignmentProgress: updateAssignmentProgressMock,
    removeAssignment: removeAssignmentMock,
    addDependency: addDependencyMock,
    removeDependency: removeDependencyMock,
  },
}))

const boardInput = {
  planId: 'plan_1',
  windowStartUtc: new Date('2026-04-01T00:00:00.000Z'),
  windowEndUtc: new Date('2026-04-10T00:00:00.000Z'),
  segmentIds: ['segment_1'],
}

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
        id: 'task_1',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'Task 1',
        color: 'BLUE' as const,
        startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
        durationDays: 3,
        estimatedEffortDays: 3,
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        taskProgressPercent: 20,
        projectedEndUtc: new Date('2026-04-06T00:00:00.000Z'),
        projectedDurationDays: 5,
        scheduleVarianceDays: 2,
        assignees: [],
      },
      {
        id: 'task_2',
        planId: 'plan_1',
        segmentId: 'segment_1',
        name: 'Task 2',
        color: 'GREEN' as const,
        startDayUtc: new Date('2026-04-02T00:00:00.000Z'),
        durationDays: 2,
        estimatedEffortDays: null,
        endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        taskProgressPercent: 0,
        projectedEndUtc: new Date('2026-04-04T00:00:00.000Z'),
        projectedDurationDays: 2,
        scheduleVarianceDays: 0,
        assignees: [],
      },
    ],
    dependencies: [
      {
        id: 'dep_1',
        predecessorTaskId: 'task_1',
        successorTaskId: 'task_2',
        type: 'FINISH_TO_START' as const,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ],
    conflicts: [
      {
        conflictType: 'TASK_OVERLAP' as const,
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
        picture: 'https://example.com/resource-1.png',
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

describe('planner hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBoardSnapshotByWindowMock.mockResolvedValue(createSnapshot())
  })

  function createWrapper(queryClient: QueryClient) {
    queryClient.setDefaultOptions({
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    })

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  test('usePlannerBoard returns data with derived task relations', async () => {
    getBoardSnapshotByWindowMock.mockResolvedValueOnce(createSnapshot())

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => usePlannerBoard(boardInput), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.board).toBeDefined()
    })

    expect(
      result.current.relations.dependenciesByTaskId.task_1.outgoing,
    ).toHaveLength(1)
    expect(
      result.current.relations.dependenciesByTaskId.task_2.incoming,
    ).toHaveLength(1)
    expect(result.current.relations.conflictsByTaskId.task_1).toHaveLength(1)
    expect(result.current.relations.conflictsByTaskId.task_2).toHaveLength(1)
  })

  test('usePlannerBoard attaches resource unavailability conflicts only to taskAId', async () => {
    const snapshot = createSnapshot()
    snapshot.conflicts = [
      {
        conflictType: 'RESOURCE_UNAVAILABLE' as const,
        resourceId: 'resource_1',
        taskAId: 'task_1',
        taskBId: null,
        overlapStartUtc: new Date('2026-04-02T00:00:00.000Z'),
        overlapEndUtc: new Date('2026-04-03T00:00:00.000Z'),
        reason: 'Vacation',
      },
    ]

    getBoardSnapshotByWindowMock.mockResolvedValueOnce(snapshot)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => usePlannerBoard(boardInput), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.board).toBeDefined()
    })

    expect(result.current.relations.conflictsByTaskId.task_1).toHaveLength(1)
    expect(result.current.relations.conflictsByTaskId.task_2).toHaveLength(0)
  })

  test('usePlannerBoard updateTask patches cached board data with setQueryData', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(plannerQueryKeys.board(boardInput), createSnapshot())
    const updatedTask: TaskModel = {
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Task 1 Updated',
      color: 'ROSE',
      startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      durationDays: 4,
      estimatedEffortDays: 4,
      endDayUtc: new Date('2026-04-07T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    }
    const refetchedSnapshot = createSnapshot()
    refetchedSnapshot.tasks = refetchedSnapshot.tasks.map((task) =>
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
    )
    getBoardSnapshotByWindowMock.mockResolvedValue(refetchedSnapshot)
    updateTaskMock.mockResolvedValueOnce(updatedTask)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.updateTask({
        id: 'task_1',
        name: 'Task 1 Updated',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(
      updatedSnapshot?.tasks.find((task) => task.id === 'task_1')?.name,
    ).toBe('Task 1 Updated')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: plannerQueryKeys.board(boardInput),
      exact: true,
    })
  })

  test('usePlannerBoard updateTask removes cached task when it moves outside the board window', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(
      plannerQueryKeys.board(boardInput),
      createSnapshot(),
    )
    updateTaskMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Task 1',
      color: 'BLUE',
      startDayUtc: new Date('2026-04-12T00:00:00.000Z'),
      durationDays: 2,
      estimatedEffortDays: 2,
      endDayUtc: new Date('2026-04-14T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.updateTask({
        id: 'task_1',
        startDayUtc: new Date('2026-04-12T00:00:00.000Z'),
        durationDays: 2,
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(updatedSnapshot?.tasks.some((task) => task.id === 'task_1')).toBe(
      false,
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  test('usePlannerBoard updateTask removes cached task when it moves out of the segment filter', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(
      plannerQueryKeys.board(boardInput),
      createSnapshot(),
    )
    updateTaskMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_2',
      name: 'Task 1',
      color: 'BLUE',
      startDayUtc: new Date('2026-04-01T00:00:00.000Z'),
      durationDays: 3,
      estimatedEffortDays: 3,
      endDayUtc: new Date('2026-04-04T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.updateTask({
        id: 'task_1',
        segmentId: 'segment_2',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(updatedSnapshot?.tasks.some((task) => task.id === 'task_1')).toBe(
      false,
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  test('usePlannerBoard updateTask skips cached board snapshots for other plans', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const otherPlanInput = {
      ...boardInput,
      planId: 'plan_2',
    }
    const otherPlanSnapshot = createSnapshot()
    otherPlanSnapshot.plan.id = 'plan_2'
    otherPlanSnapshot.tasks = otherPlanSnapshot.tasks.map((task) => ({
      ...task,
      planId: 'plan_2',
    }))

    queryClient.setQueryData(
      plannerQueryKeys.board(otherPlanInput),
      otherPlanSnapshot,
    )
    getBoardSnapshotByWindowMock.mockResolvedValue(otherPlanSnapshot)
    updateTaskMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Task 1 Updated',
      color: 'ROSE',
      startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      durationDays: 4,
      estimatedEffortDays: 4,
      endDayUtc: new Date('2026-04-07T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => usePlannerBoard(otherPlanInput), {
      wrapper,
    })

    await act(async () => {
      await result.current.actions.updateTask({
        id: 'task_1',
        name: 'Task 1 Updated',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(otherPlanInput))

    expect(updatedSnapshot?.tasks.find((task) => task.id === 'task_1')?.name).toBe(
      'Task 1',
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  test('usePlannerBoard updateTask invalidates matching board when updated task belongs but is missing', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const snapshot = createSnapshot()
    snapshot.tasks = snapshot.tasks.filter((task) => task.id !== 'task_1')

    queryClient.setQueryData(plannerQueryKeys.board(boardInput), snapshot)
    getBoardSnapshotByWindowMock.mockResolvedValue(snapshot)
    updateTaskMock.mockResolvedValueOnce({
      id: 'task_1',
      planId: 'plan_1',
      segmentId: 'segment_1',
      name: 'Task 1 Updated',
      color: 'ROSE',
      startDayUtc: new Date('2026-04-03T00:00:00.000Z'),
      durationDays: 4,
      estimatedEffortDays: 4,
      endDayUtc: new Date('2026-04-07T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.updateTask({
        id: 'task_1',
        name: 'Task 1 Updated',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(updatedSnapshot?.tasks.some((task) => task.id === 'task_1')).toBe(
      false,
    )
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: plannerQueryKeys.board(boardInput),
      exact: true,
    })
  })

  test('usePlannerBoard add/remove assignment and dependency patch board cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(
      plannerQueryKeys.board(boardInput),
      createSnapshot(),
    )

    addAssignmentMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 80,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })
    removeAssignmentMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 80,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })
    addDependencyMock.mockResolvedValueOnce({
      id: 'dep_2',
      predecessorTaskId: 'task_2',
      successorTaskId: 'task_1',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-02T00:00:00.000Z'),
    })
    removeDependencyMock.mockResolvedValueOnce({
      id: 'dep_2',
      predecessorTaskId: 'task_2',
      successorTaskId: 'task_1',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-02T00:00:00.000Z'),
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.addAssignment({
        taskId: 'task_1',
        resourceId: 'resource_1',
        progressPercent: 80,
      })
      await result.current.actions.addDependency({
        predecessorTaskId: 'task_2',
        successorTaskId: 'task_1',
        type: 'FINISH_TO_START',
      })
      await result.current.actions.removeDependency({
        predecessorTaskId: 'task_2',
        successorTaskId: 'task_1',
      })
      await result.current.actions.removeAssignment({
        taskId: 'task_1',
        resourceId: 'resource_1',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(updatedSnapshot?.tasks[0].assignees).toEqual([])
    expect(
      updatedSnapshot?.dependencies.some(
        (dependency) => dependency.id === 'dep_2',
      ),
    ).toBe(false)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: plannerQueryKeys.board(boardInput),
      exact: true,
    })
  })

  test('usePlannerBoard addDependency skips cached board snapshots without dependency endpoint tasks', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const unrelatedBoardInput = {
      ...boardInput,
      segmentIds: ['segment_unrelated'],
    }
    const unrelatedSnapshot = createSnapshot()
    unrelatedSnapshot.tasks = [
      {
        ...unrelatedSnapshot.tasks[0],
        id: 'task_9',
        segmentId: 'segment_unrelated',
      },
    ]
    unrelatedSnapshot.dependencies = []

    queryClient.setQueryData(
      plannerQueryKeys.board(unrelatedBoardInput),
      unrelatedSnapshot,
    )
    addDependencyMock.mockResolvedValueOnce({
      id: 'dep_2',
      predecessorTaskId: 'task_2',
      successorTaskId: 'task_1',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.addDependency({
        predecessorTaskId: 'task_2',
        successorTaskId: 'task_1',
        type: 'FINISH_TO_START',
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(unrelatedBoardInput))

    expect(updatedSnapshot?.dependencies).toEqual([])
  })

  test('usePlannerBoard updateAssignmentProgress patches cache and invalidates affected board', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const snapshot = createSnapshot()
    snapshot.tasks[0].assignees = [
      {
        resourceId: 'resource_1',
        resourceName: 'Resource 1',
        resourcePicture: 'https://example.com/resource-1.png',
        progressPercent: 20,
      },
    ]

    queryClient.setQueryData(plannerQueryKeys.board(boardInput), snapshot)
    const refetchedSnapshot = createSnapshot()
    refetchedSnapshot.tasks[0].assignees = [
      {
        resourceId: 'resource_1',
        resourceName: 'Resource 1',
        resourcePicture: 'https://example.com/resource-1.png',
        progressPercent: 70,
      },
    ]
    refetchedSnapshot.tasks[0].taskProgressPercent = 70
    getBoardSnapshotByWindowMock.mockResolvedValue(refetchedSnapshot)
    updateAssignmentProgressMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 70,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.updateAssignmentProgress({
        taskId: 'task_1',
        resourceId: 'resource_1',
        progressPercent: 70,
      })
    })

    const updatedSnapshot = queryClient.getQueryData<
      ReturnType<typeof createSnapshot>
    >(plannerQueryKeys.board(boardInput))

    expect(updatedSnapshot?.tasks[0].assignees?.[0]?.progressPercent).toBe(70)
    expect(updatedSnapshot?.tasks[0].taskProgressPercent).toBe(70)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: plannerQueryKeys.board(boardInput),
      exact: true,
    })
  })

  test('usePlannerBoard addAssignment invalidates as fallback when resource missing', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const snapshot = createSnapshot()
    snapshot.resources = []
    queryClient.setQueryData(plannerQueryKeys.board(boardInput), snapshot)
    const unrelatedBoardInput = {
      ...boardInput,
      segmentIds: ['segment_unrelated'],
    }
    const unrelatedSnapshot = createSnapshot()
    unrelatedSnapshot.tasks = [
      {
        ...unrelatedSnapshot.tasks[0],
        id: 'task_9',
        segmentId: 'segment_unrelated',
      },
    ]
    queryClient.setQueryData(
      plannerQueryKeys.board(unrelatedBoardInput),
      unrelatedSnapshot,
    )

    addAssignmentMock.mockResolvedValueOnce({
      id: 'assignment_1',
      taskId: 'task_1',
      resourceId: 'resource_1',
      progressPercent: 20,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await result.current.actions.addAssignment({
        taskId: 'task_1',
        resourceId: 'resource_1',
        progressPercent: 20,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: plannerQueryKeys.board(boardInput),
      exact: true,
    })
  })

  test('usePlannerBoard clears stale mutation errors before the next successful action', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(plannerQueryKeys.board(boardInput), createSnapshot())
    updateTaskMock.mockRejectedValueOnce(new Error('Update failed'))
    addDependencyMock.mockResolvedValueOnce({
      id: 'dep_2',
      predecessorTaskId: 'task_2',
      successorTaskId: 'task_1',
      type: 'FINISH_TO_START',
      createdAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const { result } = renderHook(() => usePlannerBoard(boardInput), { wrapper })

    await act(async () => {
      await expect(
        result.current.actions.updateTask({
          id: 'task_1',
          name: 'Task 1 Updated',
        }),
      ).rejects.toThrow('Update failed')
    })

    await waitFor(() => {
      expect(result.current.status.error?.message).toBe('Update failed')
    })

    await act(async () => {
      await result.current.actions.addDependency({
        predecessorTaskId: 'task_2',
        successorTaskId: 'task_1',
        type: 'FINISH_TO_START',
      })
    })

    await waitFor(() => {
      expect(result.current.status.error).toBeNull()
    })
  })

  test('usePlannerBoard exposes read and write APIs together', async () => {
    getBoardSnapshotByWindowMock.mockResolvedValueOnce(createSnapshot())

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => usePlannerBoard(boardInput), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.board).toBeDefined()
    })

    expect(typeof result.current.actions.updateTask).toBe('function')
    expect(result.current.board?.tasks).toHaveLength(2)
    expect(result.current.status.isLoading).toBe(false)
    expect(result.current.status.error).toBeNull()
  })
})
