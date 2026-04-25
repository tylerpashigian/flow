import type { QueryKey } from '@tanstack/react-query'
import { z } from 'zod'
import type { BoardSnapshotByWindowInputDto } from '#/integrations/trpc/planner/schemas'

const NormalizedBoardWindowInputSchema = z.object({
  planId: z.string(),
  windowStartUtc: z.string(),
  windowEndUtc: z.string(),
  segmentIds: z.array(z.string()),
})

export type NormalizedBoardWindowInput = z.infer<
  typeof NormalizedBoardWindowInputSchema
>

function normalizeSegmentIds(segmentIds?: string[]): string[] {
  if (!segmentIds || segmentIds.length === 0) {
    return []
  }

  return [...new Set(segmentIds)].sort((a, b) => a.localeCompare(b))
}

function toIso(value: Date): string {
  return value.toISOString()
}

export function normalizeBoardWindowInput(
  input: BoardSnapshotByWindowInputDto,
): NormalizedBoardWindowInput {
  return {
    planId: input.planId,
    windowStartUtc: toIso(input.windowStartUtc),
    windowEndUtc: toIso(input.windowEndUtc),
    segmentIds: normalizeSegmentIds(input.segmentIds),
  }
}

export const plannerQueryKeys = {
  all: () => ['planner'] as const,
  boardRoot: () => ['planner', 'board', 'snapshotByWindow'] as const,
  board: (input: BoardSnapshotByWindowInputDto) =>
    [...plannerQueryKeys.boardRoot(), normalizeBoardWindowInput(input)] as const,
}

export function getBoardWindowInputFromQueryKey(
  queryKey: QueryKey,
): NormalizedBoardWindowInput | undefined {
  if (
    queryKey.length !== 4 ||
    queryKey[0] !== 'planner' ||
    queryKey[1] !== 'board' ||
    queryKey[2] !== 'snapshotByWindow'
  ) {
    return undefined
  }

  const result = NormalizedBoardWindowInputSchema.safeParse(queryKey[3])

  return result.success ? result.data : undefined
}
