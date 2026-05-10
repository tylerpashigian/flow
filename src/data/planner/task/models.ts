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

export interface TaskFormModel {
  title: string
  startDate: Date | undefined
  durationDays: string
  segmentId?: string
  resourceId?: string
}
