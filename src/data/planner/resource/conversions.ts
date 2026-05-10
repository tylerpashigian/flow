import type {
  CreateResourceInputDto,
  ResourceDto,
  UpdateResourceInputDto,
} from '#/integrations/trpc/planner/schemas'
import type { ResourceFormModel, ResourceModel } from './models'

export function toResourceModel(dto: ResourceDto): ResourceModel {
  return { ...dto }
}

export function createDefaultResourceFormModel(): ResourceFormModel {
  return {
    name: '',
  }
}

export function toResourceFormModel(resource: ResourceModel): ResourceFormModel {
  return {
    name: resource.name,
  }
}

export function toCreateResourceInput(
  form: ResourceFormModel,
  planId: string,
): CreateResourceInputDto {
  const name = form.name.trim()

  if (!name) {
    throw new Error('Resource name is required')
  }

  return {
    planId,
    name,
  }
}

export function toUpdateResourceInput(
  form: ResourceFormModel,
  resourceId: string,
): UpdateResourceInputDto {
  const name = form.name.trim()

  if (!name) {
    throw new Error('Resource name is required')
  }

  return {
    id: resourceId,
    name,
  }
}
