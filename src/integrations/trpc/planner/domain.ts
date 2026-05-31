import { DAY_MS, STANDARD_EFFORT_DAY_MINUTES } from './constants'

interface AssignedTaskSlice {
  resourceId: string
  id: string
  startUtc: Date
  endUtc: Date
}

interface ResourceWindowSlice {
  resourceId: string
  startUtc: Date
  endUtc: Date
  reason: string | null
}

interface DependencyEdge {
  predecessorTaskId: string
  successorTaskId: string
}

interface PlannerConflict {
  conflictType: 'TASK_OVERLAP' | 'RESOURCE_UNAVAILABLE'
  resourceId: string
  taskAId: string
  taskBId: string | null
  overlapStartUtc: Date
  overlapEndUtc: Date
  reason: string | null
}

interface TaskReadAssignmentSlice {
  progressPercent: number
  resource: {
    id: string
    name: string
    picture: string | null
    capacityPercent: number
    workdayStartMinuteLocal: number
    workdayEndMinuteLocal: number
  }
}

interface TaskWithAssignmentsForRead {
  id: string
  planId: string
  segmentId: string | null
  name: string
  color: string
  startUtc: Date
  durationDays: number
  estimatedEffortDays: number | null
  endUtc: Date
  createdAt: Date
  updatedAt: Date
  assignments: TaskReadAssignmentSlice[]
}

export class PlannerDomainValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlannerDomainValidationError'
  }
}

export function isPlannerDomainValidationError(
  error: unknown,
): error is PlannerDomainValidationError {
  return error instanceof PlannerDomainValidationError
}

export function computeEndUtc(startUtc: Date, durationDays: number): Date {
  if (durationDays < 1) {
    throw new PlannerDomainValidationError('durationDays must be >= 1')
  }

  return new Date(startUtc.getTime() + durationDays * DAY_MS)
}

export function assertWindow(windowStartUtc: Date, windowEndUtc: Date): void {
  if (windowEndUtc <= windowStartUtc) {
    throw new PlannerDomainValidationError(
      'windowEndUtc must be greater than windowStartUtc',
    )
  }
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeResourceDailyFte(
  workdayStartMinuteLocal: number,
  workdayEndMinuteLocal: number,
  capacityPercent: number,
  standardEffortDayMinutes: number = STANDARD_EFFORT_DAY_MINUTES,
): number {
  const windowMinutes = Math.max(
    0,
    workdayEndMinuteLocal - workdayStartMinuteLocal,
  )
  const workdayFraction = Math.min(1, windowMinutes / standardEffortDayMinutes)

  return workdayFraction * (capacityPercent / 100)
}

interface ProjectionAssignmentSlice {
  progressPercent: number
  resource: {
    capacityPercent: number
    workdayStartMinuteLocal: number
    workdayEndMinuteLocal: number
  }
}

export function computeProjectedSchedule(
  startUtc: Date,
  plannedDurationDays: number,
  estimatedEffortDays: number | null,
  assignments: ProjectionAssignmentSlice[],
  standardEffortDayMinutes: number = STANDARD_EFFORT_DAY_MINUTES,
): {
  projectedDurationDays: number
  projectedEndUtc: Date
  scheduleVarianceDays: number
  taskProgressPercent: number
} {
  const taskProgressPercent =
    assignments.length === 0
      ? 0
      : Math.round(
          assignments.reduce(
            (sum, assignment) => sum + assignment.progressPercent,
            0,
          ) / assignments.length,
        )

  if (!estimatedEffortDays || assignments.length === 0) {
    return {
      projectedDurationDays: plannedDurationDays,
      projectedEndUtc: new Date(
        startUtc.getTime() + plannedDurationDays * DAY_MS,
      ),
      scheduleVarianceDays: 0,
      taskProgressPercent,
    }
  }

  const totalDailyFte = assignments.reduce((sum, assignment) => {
    return (
      sum +
      computeResourceDailyFte(
        assignment.resource.workdayStartMinuteLocal,
        assignment.resource.workdayEndMinuteLocal,
        assignment.resource.capacityPercent,
        standardEffortDayMinutes,
      )
    )
  }, 0)

  if (totalDailyFte <= 0) {
    return {
      projectedDurationDays: plannedDurationDays,
      projectedEndUtc: new Date(
        startUtc.getTime() + plannedDurationDays * DAY_MS,
      ),
      scheduleVarianceDays: 0,
      taskProgressPercent,
    }
  }

  const projectedDurationDays = roundToTwoDecimals(
    estimatedEffortDays / totalDailyFte,
  )
  const projectedDurationForDateMath = Math.max(
    1,
    Math.ceil(projectedDurationDays),
  )
  const projectedEndUtc = new Date(
    startUtc.getTime() + projectedDurationForDateMath * DAY_MS,
  )
  const scheduleVarianceDays = roundToTwoDecimals(
    projectedDurationDays - plannedDurationDays,
  )

  return {
    projectedDurationDays,
    projectedEndUtc,
    scheduleVarianceDays,
    taskProgressPercent,
  }
}

export function mapTaskToTaskRead(
  task: TaskWithAssignmentsForRead,
  standardEffortDayMinutes: number = STANDARD_EFFORT_DAY_MINUTES,
) {
  const {
    projectedDurationDays,
    projectedEndUtc,
    scheduleVarianceDays,
    taskProgressPercent,
  } = computeProjectedSchedule(
    task.startUtc,
    task.durationDays,
    task.estimatedEffortDays,
    task.assignments,
    standardEffortDayMinutes,
  )

  return {
    id: task.id,
    planId: task.planId,
    segmentId: task.segmentId,
    name: task.name,
    color: task.color,
    startUtc: task.startUtc,
    durationDays: task.durationDays,
    estimatedEffortDays: task.estimatedEffortDays,
    endUtc: task.endUtc,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    taskProgressPercent,
    projectedEndUtc,
    projectedDurationDays,
    scheduleVarianceDays,
    assignees: task.assignments.map((assignment) => ({
      resourceId: assignment.resource.id,
      resourceName: assignment.resource.name,
      resourcePicture: assignment.resource.picture,
      progressPercent: assignment.progressPercent,
    })),
  }
}

export function windowsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB
}

export function buildTaskOverlapConflicts(
  assignedTasks: AssignedTaskSlice[],
): PlannerConflict[] {
  const grouped = new Map<string, AssignedTaskSlice[]>()

  for (const assignment of assignedTasks) {
    const byResource = grouped.get(assignment.resourceId)

    if (!byResource) {
      grouped.set(assignment.resourceId, [assignment])
      continue
    }

    byResource.push(assignment)
  }

  const conflicts: PlannerConflict[] = []

  for (const [resourceId, tasks] of grouped.entries()) {
    const sorted = [...tasks].sort(
      (a, b) => a.startUtc.getTime() - b.startUtc.getTime(),
    )

    for (let i = 0; i < sorted.length; i += 1) {
      const left = sorted[i]

      for (let j = i + 1; j < sorted.length; j += 1) {
        const right = sorted[j]

        if (right.startUtc >= left.endUtc) {
          break
        }

        if (
          windowsOverlap(
            left.startUtc,
            left.endUtc,
            right.startUtc,
            right.endUtc,
          )
        ) {
          conflicts.push({
            conflictType: 'TASK_OVERLAP',
            resourceId,
            taskAId: left.id,
            taskBId: right.id,
            overlapStartUtc:
              left.startUtc > right.startUtc ? left.startUtc : right.startUtc,
            overlapEndUtc:
              left.endUtc < right.endUtc ? left.endUtc : right.endUtc,
            reason: null,
          })
        }
      }
    }
  }

  return conflicts
}

export function buildUnavailabilityConflicts(
  assignedTasks: AssignedTaskSlice[],
  resourceWindows: ResourceWindowSlice[],
): PlannerConflict[] {
  const windowsByResource = new Map<string, ResourceWindowSlice[]>()

  for (const window of resourceWindows) {
    const existing = windowsByResource.get(window.resourceId)

    if (!existing) {
      windowsByResource.set(window.resourceId, [window])
      continue
    }

    existing.push(window)
  }

  const conflicts: PlannerConflict[] = []

  for (const assignment of assignedTasks) {
    const windows = windowsByResource.get(assignment.resourceId)

    if (!windows || windows.length === 0) {
      continue
    }

    for (const window of windows) {
      if (
        windowsOverlap(
          assignment.startUtc,
          assignment.endUtc,
          window.startUtc,
          window.endUtc,
        )
      ) {
        conflicts.push({
          conflictType: 'RESOURCE_UNAVAILABLE',
          resourceId: assignment.resourceId,
          taskAId: assignment.id,
          taskBId: null,
          overlapStartUtc:
            assignment.startUtc > window.startUtc
              ? assignment.startUtc
              : window.startUtc,
          overlapEndUtc:
            assignment.endUtc < window.endUtc
              ? assignment.endUtc
              : window.endUtc,
          reason: window.reason,
        })
      }
    }
  }

  return conflicts
}

export function wouldCreateDependencyCycle(
  edges: DependencyEdge[],
  predecessorTaskId: string,
  successorTaskId: string,
): boolean {
  if (predecessorTaskId === successorTaskId) {
    return true
  }

  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    const list = adjacency.get(edge.predecessorTaskId)

    if (!list) {
      adjacency.set(edge.predecessorTaskId, [edge.successorTaskId])
      continue
    }

    list.push(edge.successorTaskId)
  }

  const stack = [successorTaskId]
  const seen = new Set<string>()

  while (stack.length > 0) {
    const current = stack.pop()

    if (!current || seen.has(current)) {
      continue
    }

    seen.add(current)

    if (current === predecessorTaskId) {
      return true
    }

    for (const next of adjacency.get(current) ?? []) {
      stack.push(next)
    }
  }

  return false
}

export function dedupeConflicts(
  conflicts: PlannerConflict[],
): PlannerConflict[] {
  const deduped = new Map<string, PlannerConflict>()

  for (const conflict of conflicts) {
    const key = [
      conflict.conflictType,
      conflict.resourceId,
      conflict.taskAId,
      conflict.taskBId ?? '',
      conflict.overlapStartUtc.toISOString(),
      conflict.overlapEndUtc.toISOString(),
      conflict.reason ?? '',
    ].join('|')

    deduped.set(key, conflict)
  }

  return [...deduped.values()]
}
