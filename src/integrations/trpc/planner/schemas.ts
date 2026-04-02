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
  endDayUtc: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TaskAssignmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  resourceId: z.string(),
  createdAt: z.date(),
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

export const ListByPlanInputSchema = z.object({
  planId: z.string(),
})

export const ListByPlanWindowInputSchema = z.object({
  planId: z.string(),
  windowStartUtc: IsoDateSchema,
  windowEndUtc: IsoDateSchema,
})

export const CreatePlanInputSchema = z.object({
  name: z.string().trim().min(1),
})

export const CreateSegmentInputSchema = z.object({
  planId: z.string(),
  name: z.string().trim().min(1),
})

export const CreateResourceInputSchema = z.object({
  planId: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string().trim().min(1),
  picture: z.string().nullable().optional(),
})

export const UpdateResourceInputSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string().trim().min(1).optional(),
  picture: z.string().nullable().optional(),
})

export const CreateTaskInputSchema = z.object({
  planId: z.string(),
  segmentId: z.string().nullable().optional(),
  name: z.string().trim().min(1),
  color: PlannerTaskColorSchema,
  startDayUtc: IsoDateSchema,
  durationDays: z.number().int().min(1),
})

export const UpdateTaskInputSchema = z.object({
  id: z.string(),
  segmentId: z.string().nullable().optional(),
  name: z.string().trim().min(1).optional(),
  color: PlannerTaskColorSchema.optional(),
  startDayUtc: IsoDateSchema.optional(),
  durationDays: z.number().int().min(1).optional(),
})

export const UpsertTaskAssignmentInputSchema = z.object({
  taskId: z.string(),
  resourceId: z.string(),
})

export const RemoveTaskAssignmentInputSchema = UpsertTaskAssignmentInputSchema

export const AddTaskDependencyInputSchema = z.object({
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
  type: TaskDependencyTypeSchema.default('FINISH_TO_START'),
})

export const RemoveTaskDependencyInputSchema = z.object({
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
})
