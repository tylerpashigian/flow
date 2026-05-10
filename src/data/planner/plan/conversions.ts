import type { PlanDto } from '#/integrations/trpc/planner/schemas'
import type { PlanModel } from './models'

export function toPlanModel(dto: PlanDto): PlanModel {
  return { ...dto }
}
