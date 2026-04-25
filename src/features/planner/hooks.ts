import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AddTaskDependencyInputDto,
  BoardSnapshotByWindowInputDto,
  RemoveTaskAssignmentInputDto,
  RemoveTaskDependencyInputDto,
  UpdateTaskAssignmentProgressInputDto,
  UpdateTaskInputDto,
  UpsertTaskAssignmentInputDto,
} from '#/integrations/trpc/planner/schemas'
import { plannerService } from './service'
import type {
  BoardSnapshotModel,
  PlannerConflictModel,
  TaskAssigneeModel,
  TaskAssignmentModel,
  TaskDependencyModel,
  TaskModel,
} from './models'
import {
  getBoardWindowInputFromQueryKey,
  plannerQueryKeys,
} from './query-keys'
import type { NormalizedBoardWindowInput } from './query-keys'

export interface TaskDependencyRelations {
  incoming: TaskDependencyModel[]
  outgoing: TaskDependencyModel[]
}

export interface PlannerTaskRelations {
  dependenciesByTaskId: Record<string, TaskDependencyRelations>
  conflictsByTaskId: Record<string, PlannerConflictModel[]>
}

export interface PlannerBoardStatus {
  isLoading: boolean
  isFetching: boolean
  isSaving: boolean
  error: Error | null
}

export interface PlannerBoardActions {
  updateTask: (input: UpdateTaskInputDto) => Promise<TaskModel>
  addAssignment: (
    input: UpsertTaskAssignmentInputDto,
  ) => Promise<TaskAssignmentModel>
  updateAssignmentProgress: (
    input: UpdateTaskAssignmentProgressInputDto,
  ) => Promise<TaskAssignmentModel>
  removeAssignment: (
    input: RemoveTaskAssignmentInputDto,
  ) => Promise<TaskAssignmentModel>
  addDependency: (
    input: AddTaskDependencyInputDto,
  ) => Promise<TaskDependencyModel>
  removeDependency: (
    input: RemoveTaskDependencyInputDto,
  ) => Promise<TaskDependencyModel>
}

export interface PlannerBoardResult {
  board: BoardSnapshotModel | undefined
  relations: PlannerTaskRelations
  status: PlannerBoardStatus
  actions: PlannerBoardActions
}

function buildTaskRelations(
  snapshot: BoardSnapshotModel,
): PlannerTaskRelations {
  const dependenciesByTaskId: Record<string, TaskDependencyRelations> = {}
  const conflictsByTaskId: Record<string, PlannerConflictModel[]> = {}

  for (const task of snapshot.tasks) {
    dependenciesByTaskId[task.id] = {
      incoming: [],
      outgoing: [],
    }
    conflictsByTaskId[task.id] = []
  }

  for (const dependency of snapshot.dependencies) {
    if (
      Object.hasOwn(dependenciesByTaskId, dependency.predecessorTaskId)
    ) {
      dependenciesByTaskId[dependency.predecessorTaskId].outgoing.push(
        dependency,
      )
    }

    if (Object.hasOwn(dependenciesByTaskId, dependency.successorTaskId)) {
      dependenciesByTaskId[dependency.successorTaskId].incoming.push(
        dependency,
      )
    }
  }

  for (const conflict of snapshot.conflicts) {
    if (Object.hasOwn(conflictsByTaskId, conflict.taskAId)) {
      conflictsByTaskId[conflict.taskAId].push(conflict)
    }

    if (conflict.taskBId && Object.hasOwn(conflictsByTaskId, conflict.taskBId)) {
      conflictsByTaskId[conflict.taskBId].push(conflict)
    }
  }

  return {
    dependenciesByTaskId,
    conflictsByTaskId,
  }
}

function recalculateTaskProgressFromAssignees(
  assignees?: TaskAssigneeModel[],
): number {
  if (!assignees || assignees.length === 0) {
    return 0
  }

  return Math.round(
    assignees.reduce((sum, assignee) => sum + assignee.progressPercent, 0) /
      assignees.length,
  )
}

function patchTaskInSnapshot(
  snapshot: BoardSnapshotModel,
  taskId: string,
  patcher: (task: TaskModel) => TaskModel,
): BoardSnapshotModel | undefined {
  const hasTask = snapshot.tasks.some((task) => task.id === taskId)
  if (!hasTask) {
    return undefined
  }

  const tasks = snapshot.tasks.map((task) => {
    if (task.id !== taskId) {
      return task
    }

    return patcher(task)
  })

  return {
    ...snapshot,
    tasks,
  }
}

function patchPlannerBoardQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  patcher: (snapshot: BoardSnapshotModel) => BoardSnapshotModel | undefined,
): void {
  queryClient.setQueriesData<BoardSnapshotModel>(
    { queryKey: plannerQueryKeys.boardRoot() },
    (current) => {
      if (!current) {
        return current
      }

      return patcher(current) ?? current
    },
  )
}

function taskBelongsToBoardSnapshot(
  task: TaskModel,
  boardInput: NormalizedBoardWindowInput,
): boolean {
  if (task.planId !== boardInput.planId) {
    return false
  }

  const windowStartUtc = new Date(boardInput.windowStartUtc)
  const windowEndUtc = new Date(boardInput.windowEndUtc)
  const overlapsWindow =
    task.startDayUtc < windowEndUtc && task.endDayUtc > windowStartUtc
  const matchesSegment =
    boardInput.segmentIds.length === 0 ||
    (task.segmentId !== null && boardInput.segmentIds.includes(task.segmentId))

  return overlapsWindow && matchesSegment
}

function sortTasksByBoardOrder(tasks: TaskModel[]): TaskModel[] {
  return [...tasks].sort((left, right) => {
    const startDifference =
      left.startDayUtc.getTime() - right.startDayUtc.getTime()

    if (startDifference !== 0) {
      return startDifference
    }

    return left.createdAt.getTime() - right.createdAt.getTime()
  })
}

function patchUpdatedTaskInSnapshot(
  snapshot: BoardSnapshotModel,
  boardInput: NormalizedBoardWindowInput,
  updatedTask: TaskModel,
): {
  nextSnapshot?: BoardSnapshotModel
  requiresInvalidate: boolean
} {
  const existingTaskIndex = snapshot.tasks.findIndex(
    (task) => task.id === updatedTask.id,
  )
  const taskBelongs = taskBelongsToBoardSnapshot(updatedTask, boardInput)

  if (existingTaskIndex >= 0 && taskBelongs) {
    const tasks = snapshot.tasks.map((task) =>
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
    )

    return {
      nextSnapshot: {
        ...snapshot,
        tasks: sortTasksByBoardOrder(tasks),
      },
      requiresInvalidate: true,
    }
  }

  if (existingTaskIndex >= 0 && !taskBelongs) {
    return {
      nextSnapshot: {
        ...snapshot,
        tasks: snapshot.tasks.filter((task) => task.id !== updatedTask.id),
      },
      requiresInvalidate: false,
    }
  }

  return {
    requiresInvalidate: taskBelongs,
  }
}

async function patchUpdatedTaskAcrossBoardQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedTask: TaskModel,
): Promise<void> {
  const cachedBoards = queryClient.getQueriesData<BoardSnapshotModel>({
    queryKey: plannerQueryKeys.boardRoot(),
  })
  const invalidations: Array<Promise<unknown>> = []

  for (const [queryKey, snapshot] of cachedBoards) {
    if (!snapshot) {
      continue
    }

    const boardInput = getBoardWindowInputFromQueryKey(queryKey)

    if (!boardInput || boardInput.planId !== updatedTask.planId) {
      continue
    }

    const { nextSnapshot, requiresInvalidate } = patchUpdatedTaskInSnapshot(
      snapshot,
      boardInput,
      updatedTask,
    )

    if (nextSnapshot) {
      queryClient.setQueryData(queryKey, nextSnapshot)
    }

    if (requiresInvalidate) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey,
          exact: true,
        }),
      )
    }
  }

  await Promise.all(invalidations)
}

async function invalidateBoardQueriesContainingTask(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
): Promise<void> {
  const cachedBoards = queryClient.getQueriesData<BoardSnapshotModel>({
    queryKey: plannerQueryKeys.boardRoot(),
  })
  const invalidations = cachedBoards.flatMap(([queryKey, snapshot]) => {
    if (!snapshot?.tasks.some((task) => task.id === taskId)) {
      return []
    }

    return queryClient.invalidateQueries({
      queryKey,
      exact: true,
    })
  })

  await Promise.all(invalidations)
}

function usePlannerBoardWindow(input: BoardSnapshotByWindowInputDto) {
  const query = useQuery({
    queryKey: plannerQueryKeys.board(input),
    queryFn: () => plannerService.getBoardSnapshotByWindow(input),
  })

  const relations = query.data
    ? buildTaskRelations(query.data)
    : ({
        dependenciesByTaskId: {},
        conflictsByTaskId: {},
      } satisfies PlannerTaskRelations)

  return {
    ...query,
    relations,
  }
}

function usePlannerMutations() {
  const queryClient = useQueryClient()

  const updateTask = useMutation({
    mutationFn: (input: UpdateTaskInputDto) => plannerService.updateTask(input),
    onSuccess: async (updatedTask) => {
      await patchUpdatedTaskAcrossBoardQueries(queryClient, updatedTask)
    },
  })

  const addAssignment = useMutation({
    mutationFn: (input: UpsertTaskAssignmentInputDto) =>
      plannerService.addAssignment(input),
    onSuccess: async (assignment) => {
      patchPlannerBoardQueries(queryClient, (snapshot) => {
        const resource = snapshot.resources.find(
          (candidate) => candidate.id === assignment.resourceId,
        )

        if (!resource) {
          return undefined
        }

        return patchTaskInSnapshot(snapshot, assignment.taskId, (task) => {
          const assignees = [...(task.assignees ?? [])]
          const existingIndex = assignees.findIndex(
            (assignee) => assignee.resourceId === assignment.resourceId,
          )

          if (existingIndex >= 0) {
            assignees[existingIndex] = {
              ...assignees[existingIndex],
              progressPercent: assignment.progressPercent,
            }
          } else {
            assignees.push({
              resourceId: assignment.resourceId,
              resourceName: resource.name,
              resourcePicture: resource.picture,
              progressPercent: assignment.progressPercent,
            })
          }

          return {
            ...task,
            assignees,
            taskProgressPercent:
              recalculateTaskProgressFromAssignees(assignees),
          }
        })
      })

      await invalidateBoardQueriesContainingTask(queryClient, assignment.taskId)
    },
  })

  const updateAssignmentProgress = useMutation({
    mutationFn: (input: UpdateTaskAssignmentProgressInputDto) =>
      plannerService.updateAssignmentProgress(input),
    onSuccess: async (assignment) => {
      patchPlannerBoardQueries(queryClient, (snapshot) =>
        patchTaskInSnapshot(snapshot, assignment.taskId, (task) => {
          const assignees = (task.assignees ?? []).map((assignee) =>
            assignee.resourceId === assignment.resourceId
              ? { ...assignee, progressPercent: assignment.progressPercent }
              : assignee,
          )

          return {
            ...task,
            assignees,
            taskProgressPercent:
              recalculateTaskProgressFromAssignees(assignees),
          }
        }),
      )
      await invalidateBoardQueriesContainingTask(queryClient, assignment.taskId)
    },
  })

  const removeAssignment = useMutation({
    mutationFn: (input: RemoveTaskAssignmentInputDto) =>
      plannerService.removeAssignment(input),
    onSuccess: async (assignment) => {
      patchPlannerBoardQueries(queryClient, (snapshot) =>
        patchTaskInSnapshot(snapshot, assignment.taskId, (task) => {
          const assignees = (task.assignees ?? []).filter(
            (assignee) => assignee.resourceId !== assignment.resourceId,
          )

          return {
            ...task,
            assignees,
            taskProgressPercent:
              recalculateTaskProgressFromAssignees(assignees),
          }
        }),
      )
      await invalidateBoardQueriesContainingTask(queryClient, assignment.taskId)
    },
  })

  const addDependency = useMutation({
    mutationFn: (input: AddTaskDependencyInputDto) =>
      plannerService.addDependency(input),
    onSuccess: (dependency) => {
      patchPlannerBoardQueries(queryClient, (snapshot) => {
        const hasDependencyEndpoint = snapshot.tasks.some(
          (task) =>
            task.id === dependency.predecessorTaskId ||
            task.id === dependency.successorTaskId,
        )

        if (!hasDependencyEndpoint) {
          return undefined
        }

        if (snapshot.dependencies.some((item) => item.id === dependency.id)) {
          return undefined
        }

        return {
          ...snapshot,
          dependencies: [...snapshot.dependencies, dependency],
        }
      })
    },
  })

  const removeDependency = useMutation({
    mutationFn: (input: RemoveTaskDependencyInputDto) =>
      plannerService.removeDependency(input),
    onSuccess: (dependency) => {
      patchPlannerBoardQueries(queryClient, (snapshot) => {
        const nextDependencies = snapshot.dependencies.filter(
          (item) => item.id !== dependency.id,
        )

        if (nextDependencies.length === snapshot.dependencies.length) {
          return undefined
        }

        return {
          ...snapshot,
          dependencies: nextDependencies,
        }
      })
    },
  })

  return {
    updateTask,
    addAssignment,
    updateAssignmentProgress,
    removeAssignment,
    addDependency,
    removeDependency,
  }
}

export function usePlannerBoard(
  input: BoardSnapshotByWindowInputDto,
): PlannerBoardResult {
  const boardWindow = usePlannerBoardWindow(input)
  const mutations = usePlannerMutations()
  const resetMutationErrors = () => {
    mutations.updateTask.reset()
    mutations.addAssignment.reset()
    mutations.updateAssignmentProgress.reset()
    mutations.removeAssignment.reset()
    mutations.addDependency.reset()
    mutations.removeDependency.reset()
  }
  const mutationError =
    (mutations.updateTask.isError ? mutations.updateTask.error : null) ??
    (mutations.addAssignment.isError ? mutations.addAssignment.error : null) ??
    (mutations.updateAssignmentProgress.isError
      ? mutations.updateAssignmentProgress.error
      : null) ??
    (mutations.removeAssignment.isError
      ? mutations.removeAssignment.error
      : null) ??
    (mutations.addDependency.isError ? mutations.addDependency.error : null) ??
    (mutations.removeDependency.isError
      ? mutations.removeDependency.error
      : null) ??
    null

  return {
    board: boardWindow.data,
    relations: boardWindow.relations,
    status: {
      isLoading: boardWindow.isLoading,
      isFetching: boardWindow.isFetching,
      isSaving:
        mutations.updateTask.isPending ||
        mutations.addAssignment.isPending ||
        mutations.updateAssignmentProgress.isPending ||
        mutations.removeAssignment.isPending ||
        mutations.addDependency.isPending ||
        mutations.removeDependency.isPending,
      error: boardWindow.error ?? mutationError,
    },
    actions: {
      updateTask: async (actionInput) => {
        resetMutationErrors()

        return mutations.updateTask.mutateAsync(actionInput)
      },
      addAssignment: async (actionInput) => {
        resetMutationErrors()

        return mutations.addAssignment.mutateAsync(actionInput)
      },
      updateAssignmentProgress: async (actionInput) => {
        resetMutationErrors()

        return mutations.updateAssignmentProgress.mutateAsync(actionInput)
      },
      removeAssignment: async (actionInput) => {
        resetMutationErrors()

        return mutations.removeAssignment.mutateAsync(actionInput)
      },
      addDependency: async (actionInput) => {
        resetMutationErrors()

        return mutations.addDependency.mutateAsync(actionInput)
      },
      removeDependency: async (actionInput) => {
        resetMutationErrors()

        return mutations.removeDependency.mutateAsync(actionInput)
      },
    },
  }
}
