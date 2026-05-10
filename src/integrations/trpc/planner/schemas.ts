import { z } from 'zod'

export const PlannerTaskColorSchema = z.enum([
  'SLATE',
  'BLUE',
  'GREEN',
  'AMBER',
  'ROSE',
  'VIOLET',
])

export const TaskDependencyTypeSchema = z.enum(['FINISH_TO_START'])

export const IsoDateSchema = z.coerce.date()

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const SegmentSchema = z.object({
  id: z.string(),
  planId: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ResourceSchema = z.object({
  id: z.string(),
  planId: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  picture: z.string().nullable(),
  capacityPercent: z.number().int().min(0).max(100),
  timezone: z.string().trim().min(1),
  workdayStartMinuteLocal: z.number().int().min(0).max(1439),
  workdayEndMinuteLocal: z.number().int().min(1).max(1440),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TaskSchema = z.object({
  id: z.string(),
  planId: z.string(),
  segmentId: z.string().nullable(),
  name: z.string(),
  color: PlannerTaskColorSchema,
  startDayUtc: z.date(),
  durationDays: z.number().int().min(1),
  estimatedEffortDays: z.number().int().min(1).nullable(),
  endDayUtc: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TaskReadSchema = TaskSchema.extend({
  taskProgressPercent: z.number().int().min(0).max(100),
  projectedEndUtc: z.date(),
  projectedDurationDays: z.number().min(0),
  scheduleVarianceDays: z.number(),
  assignees: z.array(
    z.object({
      resourceId: z.string(),
      resourceName: z.string(),
      resourcePicture: z.string().nullable(),
      progressPercent: z.number().int().min(0).max(100),
    }),
  ),
})

export const TaskAssignmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  resourceId: z.string(),
  progressPercent: z.number().int().min(0).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TaskDependencySchema = z.object({
  id: z.string(),
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
  type: TaskDependencyTypeSchema,
  createdAt: z.date(),
})

export const ResourceUnavailabilitySchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  startDayUtc: z.date(),
  endDayUtc: z.date(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const PlannerConflictTypeSchema = z.enum([
  'TASK_OVERLAP',
  'RESOURCE_UNAVAILABLE',
])

export const PlannerConflictSchema = z.object({
  conflictType: PlannerConflictTypeSchema,
  resourceId: z.string(),
  taskAId: z.string(),
  taskBId: z.string().nullable(),
  overlapStartUtc: z.date(),
  overlapEndUtc: z.date(),
  reason: z.string().nullable(),
})

export const PlannerConflictListSchema = z.array(PlannerConflictSchema)

export const PlannerBoardSnapshotWindowSchema = z.object({
  windowStartUtc: z.date(),
  windowEndUtc: z.date(),
})

export const PlannerBoardSnapshotSchema = z.object({
  plan: PlanSchema,
  window: PlannerBoardSnapshotWindowSchema,
  tasks: TaskReadSchema.array(),
  dependencies: TaskDependencySchema.array(),
  conflicts: PlannerConflictListSchema,
  resources: ResourceSchema.array(),
  segments: SegmentSchema.array(),
})

export const ListByPlanInputSchema = z.object({
  planId: z.string(),
})

export const ListByPlanWindowInputSchema = z.object({
  planId: z.string(),
  windowStartUtc: IsoDateSchema,
  windowEndUtc: IsoDateSchema,
})

export const BoardSnapshotByWindowInputSchema =
  ListByPlanWindowInputSchema.extend({
    segmentIds: z.array(z.string()).optional(),
  })

export const CreatePlanInputSchema = z.object({
  name: z.string().trim().min(1),
})

export const CreateSegmentInputSchema = z.object({
  planId: z.string(),
  name: z.string().trim().min(1),
})

export const UpdateSegmentInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
})

type ResourceWorkdayWindowInput = {
  workdayStartMinuteLocal?: number
  workdayEndMinuteLocal?: number
}

const workDayWindowErrorConfig: {
  message: string
  path: [string]
} = {
  message: 'workdayEndMinuteLocal must be greater than workdayStartMinuteLocal',
  path: ['workdayEndMinuteLocal'],
}

const hasValidWorkdayWindow = (value: ResourceWorkdayWindowInput) => {
  if (
    typeof value.workdayStartMinuteLocal === 'number' &&
    typeof value.workdayEndMinuteLocal === 'number'
  ) {
    return value.workdayEndMinuteLocal > value.workdayStartMinuteLocal
  }
  return true
}

export const CreateResourceInputSchema = z
  .object({
    planId: z.string(),
    userId: z.string().nullable().optional(),
    name: z.string().trim().min(1),
    picture: z.string().nullable().optional(),
    capacityPercent: z.number().int().min(0).max(100).optional(),
    timezone: z.string().trim().min(1).optional(),
    workdayStartMinuteLocal: z.number().int().min(0).max(1439).optional(),
    workdayEndMinuteLocal: z.number().int().min(1).max(1440).optional(),
  })
  .refine(hasValidWorkdayWindow, workDayWindowErrorConfig)

export const UpdateResourceInputSchema = z
  .object({
    id: z.string(),
    userId: z.string().nullable().optional(),
    name: z.string().trim().min(1).optional(),
    picture: z.string().nullable().optional(),
    capacityPercent: z.number().int().min(0).max(100).optional(),
    timezone: z.string().trim().min(1).optional(),
    workdayStartMinuteLocal: z.number().int().min(0).max(1439).optional(),
    workdayEndMinuteLocal: z.number().int().min(1).max(1440).optional(),
  })
  .refine(hasValidWorkdayWindow, workDayWindowErrorConfig)

export const CreateTaskInputSchema = z.object({
  planId: z.string(),
  segmentId: z.string().nullable().optional(),
  name: z.string().trim().min(1),
  color: PlannerTaskColorSchema,
  startDayUtc: IsoDateSchema,
  durationDays: z.number().int().min(1),
  estimatedEffortDays: z.number().int().min(1).optional(),
})

export const UpdateTaskInputSchema = z.object({
  id: z.string(),
  segmentId: z.string().nullable().optional(),
  name: z.string().trim().min(1).optional(),
  color: PlannerTaskColorSchema.optional(),
  startDayUtc: IsoDateSchema.optional(),
  durationDays: z.number().int().min(1).optional(),
  estimatedEffortDays: z.number().int().min(1).nullable().optional(),
})

export const UpsertTaskAssignmentInputSchema = z.object({
  taskId: z.string(),
  resourceId: z.string(),
  progressPercent: z.number().int().min(0).max(100).optional(),
})

export const RemoveTaskAssignmentInputSchema = z.object({
  taskId: z.string(),
  resourceId: z.string(),
})

export const UpdateTaskAssignmentProgressInputSchema = z.object({
  taskId: z.string(),
  resourceId: z.string(),
  progressPercent: z.number().int().min(0).max(100),
})

export const AddTaskDependencyInputSchema = z.object({
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
  type: TaskDependencyTypeSchema.default('FINISH_TO_START'),
})

export const RemoveTaskDependencyInputSchema = z.object({
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
})

export type PlanDto = z.infer<typeof PlanSchema>
export type SegmentDto = z.infer<typeof SegmentSchema>
export type ResourceDto = z.infer<typeof ResourceSchema>
export type TaskDto = z.infer<typeof TaskSchema>
export type TaskReadDto = z.infer<typeof TaskReadSchema>
export type TaskAssignmentDto = z.infer<typeof TaskAssignmentSchema>
export type TaskDependencyDto = z.infer<typeof TaskDependencySchema>
export type PlannerConflictDto = z.infer<typeof PlannerConflictSchema>
export type PlannerBoardSnapshotDto = z.infer<typeof PlannerBoardSnapshotSchema>
export type ListByPlanInputDto = z.infer<typeof ListByPlanInputSchema>
export type CreatePlanInputDto = z.infer<typeof CreatePlanInputSchema>
export type CreateSegmentInputDto = z.infer<typeof CreateSegmentInputSchema>
export type UpdateSegmentInputDto = z.infer<typeof UpdateSegmentInputSchema>
export type CreateResourceInputDto = z.infer<typeof CreateResourceInputSchema>
export type UpdateResourceInputDto = z.infer<typeof UpdateResourceInputSchema>
export type BoardSnapshotByWindowInputDto = z.infer<
  typeof BoardSnapshotByWindowInputSchema
>
export type CreateTaskInputDto = z.infer<typeof CreateTaskInputSchema>
export type UpdateTaskInputDto = z.infer<typeof UpdateTaskInputSchema>
export type UpsertTaskAssignmentInputDto = z.infer<
  typeof UpsertTaskAssignmentInputSchema
>
export type UpdateTaskAssignmentProgressInputDto = z.infer<
  typeof UpdateTaskAssignmentProgressInputSchema
>
export type RemoveTaskAssignmentInputDto = z.infer<
  typeof RemoveTaskAssignmentInputSchema
>
export type AddTaskDependencyInputDto = z.infer<
  typeof AddTaskDependencyInputSchema
>
export type RemoveTaskDependencyInputDto = z.infer<
  typeof RemoveTaskDependencyInputSchema
>
