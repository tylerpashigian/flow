import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AddTaskDependencyInputDto,
  BoardSnapshotByWindowInputDto,
  CreateResourceInputDto,
  CreateSegmentInputDto,
  CreateTaskInputDto,
  RemoveTaskAssignmentInputDto,
  RemoveTaskDependencyInputDto,
  UpdateResourceInputDto,
  UpdateSegmentInputDto,
  UpdateTaskAssignmentProgressInputDto,
  UpdateTaskInputDto,
  UpsertTaskAssignmentInputDto,
} from '#/integrations/trpc/planner/schemas'
import { plannerService } from './service'
import type {
  BoardSnapshotModel,
  PlanModel,
  PlannerConflictModel,
  ResourceModel,
  SegmentModel,
  TaskAssigneeModel,
  TaskAssignmentModel,
  TaskDependencyModel,
  TaskModel,
} from '#/data/planner'
import { getBoardWindowInputFromQueryKey, plannerQueryKeys } from './query-keys'
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
  createResource: (input: CreateResourceInputDto) => Promise<ResourceModel>
  updateResource: (input: UpdateResourceInputDto) => Promise<ResourceModel>
  createSegment: (input: CreateSegmentInputDto) => Promise<SegmentModel>
  updateSegment: (input: UpdateSegmentInputDto) => Promise<SegmentModel>
  createTask: (input: CreateTaskInputDto) => Promise<TaskModel>
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

export interface PlannerBootstrapStatus {
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
}

export interface PlannerBootstrapResult {
  activePlan: PlanModel | undefined
  resources: ResourceModel[]
  segments: SegmentModel[]
  status: PlannerBootstrapStatus
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
    if (Object.hasOwn(dependenciesByTaskId, dependency.predecessorTaskId)) {
      dependenciesByTaskId[dependency.predecessorTaskId].outgoing.push(
        dependency,
      )
    }

    if (Object.hasOwn(dependenciesByTaskId, dependency.successorTaskId)) {
      dependenciesByTaskId[dependency.successorTaskId].incoming.push(dependency)
    }
  }

  for (const conflict of snapshot.conflicts) {
    if (Object.hasOwn(conflictsByTaskId, conflict.taskAId)) {
      conflictsByTaskId[conflict.taskAId].push(conflict)
    }

    if (
      conflict.taskBId &&
      Object.hasOwn(conflictsByTaskId, conflict.taskBId)
    ) {
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

async function invalidateBoardQueriesForCreatedTask(
  queryClient: ReturnType<typeof useQueryClient>,
  createdTask: TaskModel,
): Promise<void> {
  const cachedBoards = queryClient.getQueriesData<BoardSnapshotModel>({
    queryKey: plannerQueryKeys.boardRoot(),
  })
  const invalidations: Array<Promise<unknown>> = []

  for (const [queryKey] of cachedBoards) {
    const boardInput = getBoardWindowInputFromQueryKey(queryKey)

    if (!boardInput || boardInput.planId !== createdTask.planId) {
      continue
    }

    if (!taskBelongsToBoardSnapshot(createdTask, boardInput)) {
      continue
    }

    invalidations.push(
      queryClient.invalidateQueries({
        queryKey,
        exact: true,
      }),
    )
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

function usePlannerBoardWindow(
  input: BoardSnapshotByWindowInputDto,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: plannerQueryKeys.board(input),
    queryFn: () => plannerService.getBoardSnapshotByWindow(input),
    enabled,
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

  const createResource = useMutation({
    mutationFn: (input: CreateResourceInputDto) =>
      plannerService.createResource(input),
    onSuccess: async (resource) => {
      await queryClient.invalidateQueries({
        queryKey: plannerQueryKeys.resources(resource.planId),
        exact: true,
      })
    },
  })

  const updateResource = useMutation({
    mutationFn: (input: UpdateResourceInputDto) =>
      plannerService.updateResource(input),
    onSuccess: async (resource) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: plannerQueryKeys.resources(resource.planId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: plannerQueryKeys.boardRoot(),
        }),
      ])
    },
  })

  const createSegment = useMutation({
    mutationFn: (input: CreateSegmentInputDto) =>
      plannerService.createSegment(input),
    onSuccess: async (segment) => {
      await queryClient.invalidateQueries({
        queryKey: plannerQueryKeys.segments(segment.planId),
        exact: true,
      })
    },
  })

  const updateSegment = useMutation({
    mutationFn: (input: UpdateSegmentInputDto) =>
      plannerService.updateSegment(input),
    onSuccess: async (segment) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: plannerQueryKeys.segments(segment.planId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: plannerQueryKeys.boardRoot(),
        }),
      ])
    },
  })

  const createTask = useMutation({
    mutationFn: (input: CreateTaskInputDto) => plannerService.createTask(input),
    onSuccess: async (task) => {
      await invalidateBoardQueriesForCreatedTask(queryClient, task)
    },
  })

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
    createResource,
    updateResource,
    createSegment,
    updateSegment,
    createTask,
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
  options?: { enabled?: boolean },
): PlannerBoardResult {
  const boardWindow = usePlannerBoardWindow(input, options?.enabled ?? true)
  const mutations = usePlannerMutations()
  const resetMutationErrors = () => {
    mutations.createResource.reset()
    mutations.updateResource.reset()
    mutations.createSegment.reset()
    mutations.updateSegment.reset()
    mutations.createTask.reset()
    mutations.updateTask.reset()
    mutations.addAssignment.reset()
    mutations.updateAssignmentProgress.reset()
    mutations.removeAssignment.reset()
    mutations.addDependency.reset()
    mutations.removeDependency.reset()
  }
  const mutationError =
    (mutations.createResource.isError
      ? mutations.createResource.error
      : null) ??
    (mutations.updateResource.isError
      ? mutations.updateResource.error
      : null) ??
    (mutations.createSegment.isError ? mutations.createSegment.error : null) ??
    (mutations.updateSegment.isError ? mutations.updateSegment.error : null) ??
    (mutations.createTask.isError ? mutations.createTask.error : null) ??
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
        mutations.createResource.isPending ||
        mutations.updateResource.isPending ||
        mutations.createSegment.isPending ||
        mutations.updateSegment.isPending ||
        mutations.createTask.isPending ||
        mutations.updateTask.isPending ||
        mutations.addAssignment.isPending ||
        mutations.updateAssignmentProgress.isPending ||
        mutations.removeAssignment.isPending ||
        mutations.addDependency.isPending ||
        mutations.removeDependency.isPending,
      error: boardWindow.error ?? mutationError,
    },
    actions: {
      createResource: async (actionInput) => {
        resetMutationErrors()

        return mutations.createResource.mutateAsync(actionInput)
      },
      updateResource: async (actionInput) => {
        resetMutationErrors()

        return mutations.updateResource.mutateAsync(actionInput)
      },
      createSegment: async (actionInput) => {
        resetMutationErrors()

        return mutations.createSegment.mutateAsync(actionInput)
      },
      updateSegment: async (actionInput) => {
        resetMutationErrors()

        return mutations.updateSegment.mutateAsync(actionInput)
      },
      createTask: async (actionInput) => {
        resetMutationErrors()

        return mutations.createTask.mutateAsync(actionInput)
      },
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

export function usePlannerBootstrap(): PlannerBootstrapResult {
  const activePlanQuery = useQuery({
    queryKey: plannerQueryKeys.activePlan(),
    queryFn: () => plannerService.getOrCreateDefaultPlan(),
  })
  const planId = activePlanQuery.data?.id
  const resourcesQuery = useQuery({
    queryKey: planId
      ? plannerQueryKeys.resources(planId)
      : [...plannerQueryKeys.resources('pending'), 'disabled'],
    queryFn: () => plannerService.listResourcesByPlan({ planId: planId! }),
    enabled: Boolean(planId),
  })
  const segmentsQuery = useQuery({
    queryKey: planId
      ? plannerQueryKeys.segments(planId)
      : [...plannerQueryKeys.segments('pending'), 'disabled'],
    queryFn: () => plannerService.listSegmentsByPlan({ planId: planId! }),
    enabled: Boolean(planId),
  })

  return {
    activePlan: activePlanQuery.data,
    resources: resourcesQuery.data ?? [],
    segments: segmentsQuery.data ?? [],
    status: {
      isLoading:
        activePlanQuery.isLoading ||
        (Boolean(planId) &&
          (resourcesQuery.isLoading || segmentsQuery.isLoading)),
      isRefreshing:
        activePlanQuery.isFetching ||
        resourcesQuery.isFetching ||
        segmentsQuery.isFetching,
      error:
        activePlanQuery.error ??
        resourcesQuery.error ??
        segmentsQuery.error ??
        null,
    },
  }
}
