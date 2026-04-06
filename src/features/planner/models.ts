export interface PlanModel {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface SegmentModel {
  id: string
  planId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface ResourceModel {
  id: string
  planId: string
  userId: string | null
  name: string
  picture: string | null
  capacityPercent: number
  timezone: string
  workdayStartMinuteLocal: number
  workdayEndMinuteLocal: number
  createdAt: Date
  updatedAt: Date
}

export interface TaskAssigneeModel {
  resourceId: string
  resourceName: string
  resourcePicture: string | null
  progressPercent: number
}

export interface TaskModel {
  id: string
  planId: string
  segmentId: string | null
  name: string
  color: 'SLATE' | 'BLUE' | 'GREEN' | 'AMBER' | 'ROSE' | 'VIOLET'
  startDayUtc: Date
  durationDays: number
  estimatedEffortDays: number | null
  endDayUtc: Date
  createdAt: Date
  updatedAt: Date
  taskProgressPercent?: number
  projectedEndUtc?: Date
  projectedDurationDays?: number
  scheduleVarianceDays?: number
  assignees?: TaskAssigneeModel[]
}

export interface TaskAssignmentModel {
  id: string
  taskId: string
  resourceId: string
  progressPercent: number
  createdAt: Date
  updatedAt: Date
}

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
