import type { PlanModel } from '../plan/models'
import type { ResourceModel } from '../resource/models'
import type { SegmentModel } from '../segment/models'
import type { TaskModel } from '../task/models'

export interface TaskDependencyModel {
  id: string
  predecessorTaskId: string
  successorTaskId: string
  type: 'FINISH_TO_START'
  createdAt: Date
}

export interface PlannerConflictModel {
  conflictType: 'TASK_OVERLAP' | 'RESOURCE_UNAVAILABLE'
  resourceId: string
  taskAId: string
  taskBId: string | null
  overlapStartUtc: Date
  overlapEndUtc: Date
  reason: string | null
}

export interface BoardWindowModel {
  windowStartUtc: Date
  windowEndUtc: Date
}

export interface BoardSnapshotModel {
  plan: PlanModel
  window: BoardWindowModel
  tasks: TaskModel[]
  dependencies: TaskDependencyModel[]
  conflicts: PlannerConflictModel[]
  resources: ResourceModel[]
  segments: SegmentModel[]
}

export interface TaskAssignmentModel {
  id: string
  taskId: string
  resourceId: string
  progressPercent: number
  createdAt: Date
  updatedAt: Date
}
