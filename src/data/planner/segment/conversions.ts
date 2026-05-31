import type {
  CreateSegmentInputDto,
  SegmentDto,
  UpdateSegmentInputDto,
} from '#/integrations/trpc/planner/schemas'
import type { SegmentFormModel, SegmentModel } from './models'

export function toSegmentModel(dto: SegmentDto): SegmentModel {
  return { ...dto }
}

export function createDefaultSegmentFormModel(): SegmentFormModel {
  return {
    name: '',
  }
}

export function toSegmentFormModel(segment: SegmentModel): SegmentFormModel {
  return {
    name: segment.name,
  }
}

export function toCreateSegmentInput(
  form: SegmentFormModel,
  planId: string,
): CreateSegmentInputDto {
  const name = form.name.trim()

  if (!name) {
    throw new Error('Segment name is required')
  }

  return {
    planId,
    name,
  }
}

export function toUpdateSegmentInput(
  form: SegmentFormModel,
  segmentId: string,
): UpdateSegmentInputDto {
  const name = form.name.trim()

  if (!name) {
    throw new Error('Segment name is required')
  }

  return {
    id: segmentId,
    name,
  }
}
