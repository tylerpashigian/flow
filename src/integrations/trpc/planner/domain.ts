import { TRPCError } from '@trpc/server'

export interface AssignedTaskSlice {
  resourceId: string
  id: string
  startDayUtc: Date
  endDayUtc: Date
}

export interface ResourceWindowSlice {
  resourceId: string
  startDayUtc: Date
  endDayUtc: Date
  reason: string | null
}

export interface DependencyEdge {
  predecessorTaskId: string
  successorTaskId: string
}

export interface PlannerConflict {
  conflictType: 'TASK_OVERLAP' | 'RESOURCE_UNAVAILABLE'
  resourceId: string
  taskAId: string
  taskBId: string | null
  overlapStartUtc: Date
  overlapEndUtc: Date
  reason: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export function toUtcStartOfDay(value: Date): Date {
  const normalized = new Date(value)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

export function computeEndDayUtc(
  startDayUtc: Date,
  durationDays: number,
): Date {
  if (durationDays < 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'durationDays must be >= 1',
    })
  }

  return new Date(
    toUtcStartOfDay(startDayUtc).getTime() + durationDays * DAY_MS,
  )
}

export function assertWindow(windowStartUtc: Date, windowEndUtc: Date): void {
  if (windowEndUtc <= windowStartUtc) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'windowEndUtc must be greater than windowStartUtc',
    })
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
      (a, b) => a.startDayUtc.getTime() - b.startDayUtc.getTime(),
    )

    for (let i = 0; i < sorted.length; i += 1) {
      const left = sorted[i]

      for (let j = i + 1; j < sorted.length; j += 1) {
        const right = sorted[j]

        if (right.startDayUtc >= left.endDayUtc) {
          break
        }

        if (
          windowsOverlap(
            left.startDayUtc,
            left.endDayUtc,
            right.startDayUtc,
            right.endDayUtc,
          )
        ) {
          conflicts.push({
            conflictType: 'TASK_OVERLAP',
            resourceId,
            taskAId: left.id,
            taskBId: right.id,
            overlapStartUtc:
              left.startDayUtc > right.startDayUtc
                ? left.startDayUtc
                : right.startDayUtc,
            overlapEndUtc:
              left.endDayUtc < right.endDayUtc
                ? left.endDayUtc
                : right.endDayUtc,
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
          assignment.startDayUtc,
          assignment.endDayUtc,
          window.startDayUtc,
          window.endDayUtc,
        )
      ) {
        conflicts.push({
          conflictType: 'RESOURCE_UNAVAILABLE',
          resourceId: assignment.resourceId,
          taskAId: assignment.id,
          taskBId: null,
          overlapStartUtc:
            assignment.startDayUtc > window.startDayUtc
              ? assignment.startDayUtc
              : window.startDayUtc,
          overlapEndUtc:
            assignment.endDayUtc < window.endDayUtc
              ? assignment.endDayUtc
              : window.endDayUtc,
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
