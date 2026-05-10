import type {
  PlannerBoardSnapshotDto,
  PlannerConflictDto,
  TaskAssignmentDto,
  TaskDependencyDto,
} from '#/integrations/trpc/planner/schemas'
import { toPlanModel } from '../plan/conversions'
import { toResourceModel } from '../resource/conversions'
import { toSegmentModel } from '../segment/conversions'
import { toTaskModelFromRead } from '../task/conversions'
import type {
  BoardSnapshotModel,
  PlannerConflictModel,
  TaskAssignmentModel,
  TaskDependencyModel,
} from './models'

export function toTaskAssignmentModel(
  dto: TaskAssignmentDto,
): TaskAssignmentModel {
  return { ...dto }
}

export function toTaskDependencyModel(
  dto: TaskDependencyDto,
): TaskDependencyModel {
  return { ...dto }
}

export function toPlannerConflictModel(
  dto: PlannerConflictDto,
): PlannerConflictModel {
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
