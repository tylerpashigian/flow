import type {
  PlannerBoardSnapshotDto,
  PlannerConflictDto,
  PlanDto,
  ResourceDto,
  SegmentDto,
  TaskAssignmentDto,
  TaskDependencyDto,
  TaskDto,
  TaskReadDto,
} from '#/integrations/trpc/planner/schemas'
import type {
  BoardSnapshotModel,
  PlannerConflictModel,
  PlanModel,
  ResourceModel,
  SegmentModel,
  TaskAssignmentModel,
  TaskDependencyModel,
  TaskModel,
} from './models'

export function toPlanModel(dto: PlanDto): PlanModel {
  return { ...dto }
}

export function toSegmentModel(dto: SegmentDto): SegmentModel {
  return { ...dto }
}

export function toResourceModel(dto: ResourceDto): ResourceModel {
  return { ...dto }
}

export function toTaskModelFromRead(dto: TaskReadDto): TaskModel {
  return { ...dto }
}

export function toTaskModelFromTask(dto: TaskDto): TaskModel {
  return { ...dto }
}

export function toTaskAssignmentModel(dto: TaskAssignmentDto): TaskAssignmentModel {
  return { ...dto }
}

export function toTaskDependencyModel(dto: TaskDependencyDto): TaskDependencyModel {
  return { ...dto }
}

export function toPlannerConflictModel(dto: PlannerConflictDto): PlannerConflictModel {
  return { ...dto }
}

export function toBoardSnapshotModel(
  dto: PlannerBoardSnapshotDto,
): BoardSnapshotModel {
  return {
    plan: toPlanModel(dto.plan),
    window: { ...dto.window },
    tasks: dto.tasks.map(toTaskModelFromRead),
    dependencies: dto.dependencies.map(toTaskDependencyModel),
    conflicts: dto.conflicts.map(toPlannerConflictModel),
    resources: dto.resources.map(toResourceModel),
    segments: dto.segments.map(toSegmentModel),
  }
}
