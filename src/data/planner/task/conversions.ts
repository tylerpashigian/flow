import type {
  CreateTaskInputDto,
  TaskDto,
  TaskReadDto,
  UpdateTaskInputDto,
  UpsertTaskAssignmentInputDto,
} from '#/integrations/trpc/planner/schemas'
import type { TaskFormModel, TaskModel } from './models'

export const DEFAULT_TASK_COLOR = 'BLUE' as const

function toUtcStartOfSelectedDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export function toTaskModelFromRead(dto: TaskReadDto): TaskModel {
  return { ...dto }
}

export function toTaskModelFromTask(dto: TaskDto): TaskModel {
  return { ...dto }
}

export function createDefaultTaskFormModel(startDate?: Date): TaskFormModel {
  return {
    title: '',
    startDate,
    durationDays: '1',
    segmentId: undefined,
    resourceId: undefined,
  }
}

export function toTaskFormModel(task: TaskModel): TaskFormModel {
  return {
    title: task.name,
    startDate: task.startDayUtc,
    durationDays: String(task.durationDays),
    segmentId: task.segmentId ?? undefined,
    resourceId: task.assignees?.[0]?.resourceId,
  }
}

export function toCreateTaskInput(
  form: TaskFormModel,
  planId: string,
): CreateTaskInputDto {
  const name = form.title.trim()
  const durationDays = Number.parseInt(form.durationDays, 10)

  if (!name) {
    throw new Error('Task title is required')
  }

  if (!form.startDate) {
    throw new Error('Task start date is required')
  }

  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error('Task duration must be at least 1 day')
  }

  return {
    planId,
    segmentId: form.segmentId ?? null,
    name,
    color: DEFAULT_TASK_COLOR,
    startDayUtc: toUtcStartOfSelectedDay(form.startDate),
    durationDays,
  }
}

export function toUpdateTaskInput(
  form: TaskFormModel,
  taskId: string,
): UpdateTaskInputDto {
  const name = form.title.trim()
  const durationDays = Number.parseInt(form.durationDays, 10)

  if (!name) {
    throw new Error('Task title is required')
  }

  if (!form.startDate) {
    throw new Error('Task start date is required')
  }

  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error('Task duration must be at least 1 day')
  }

  return {
    id: taskId,
    segmentId: form.segmentId ?? null,
    name,
    color: DEFAULT_TASK_COLOR,
    startDayUtc: toUtcStartOfSelectedDay(form.startDate),
    durationDays,
  }
}

export function toOptionalTaskAssignmentInput(
  form: TaskFormModel,
  taskId: string,
): UpsertTaskAssignmentInputDto | null {
  if (!form.resourceId) {
    return null
  }

  return {
    taskId,
    resourceId: form.resourceId,
  }
}
