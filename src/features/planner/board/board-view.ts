import { toPlannerDayKey } from '@/lib/date'
import type { PlannerDayKey } from '@/types/date'
import type { BoardSnapshotModel } from '#/data/planner'
import type { PlannerTaskRelations } from '@/features/planner/hooks'

export const PLANNER_ROW_LABEL_WIDTH = 224
export const PLANNER_HEADER_HEIGHT = 48
export const PLANNER_LANE_HEIGHT = 88
export const PLANNER_LANE_GAP = 8
export const PLANNER_ROW_VERTICAL_PADDING = 8

export interface PlannerBoardTaskCardViewModel {
  id: string
  taskId: string
  title: string
  color: 'SLATE' | 'BLUE' | 'GREEN' | 'AMBER' | 'ROSE' | 'VIOLET'
  segmentName: string | null
  assigneeName: string | null
  progressPercent: number | null
  durationDays: number
  startDayKey: PlannerDayKey
  startColumn: number
  columnSpan: number
  laneIndex: number
  conflictCount: number
}

export interface PlannerBoardRowViewModel {
  id: string
  label: string
  picture: string | null
  rowIndex: number
  laneCount: number
  taskCount: number
  tasks: PlannerBoardTaskCardViewModel[]
}

export function getTaskStartColumn(
  startDayKey: PlannerDayKey,
  renderedWindowStartDayKey: PlannerDayKey,
): number {
  return startDayKey - renderedWindowStartDayKey + 1
}

export function getTaskColumnSpan(durationDays: number): number {
  return durationDays
}

function sortTasksByLogicalPlacement(
  left: PlannerBoardTaskCardViewModel,
  right: PlannerBoardTaskCardViewModel,
): number {
  const startColumnDifference = left.startColumn - right.startColumn

  if (startColumnDifference !== 0) {
    return startColumnDifference
  }

  const titleDifference = left.title.localeCompare(right.title)

  if (titleDifference !== 0) {
    return titleDifference
  }

  return left.id.localeCompare(right.id)
}

export function buildPlannerBoardRows(
  snapshot: BoardSnapshotModel,
  relations: PlannerTaskRelations,
  options: {
    renderedWindowStartDayKey: PlannerDayKey
  },
): PlannerBoardRowViewModel[] {
  const segmentNames = new Map(
    snapshot.segments.map((segment) => [segment.id, segment.name]),
  )
  const rowMap = new Map<string, PlannerBoardRowViewModel>()
  const resourceOrder: string[] = []

  for (const resource of snapshot.resources) {
    resourceOrder.push(resource.id)
    rowMap.set(resource.id, {
      id: resource.id,
      label: resource.name,
      picture: resource.picture,
      rowIndex: -1,
      laneCount: 1,
      taskCount: 0,
      tasks: [],
    })
  }

  const unassignedRow: PlannerBoardRowViewModel = {
    id: 'unassigned',
    label: 'Unassigned',
    picture: null,
    rowIndex: -1,
    laneCount: 1,
    taskCount: 0,
    tasks: [],
  }

  for (const task of snapshot.tasks) {
    const assignee = task.assignees?.[0] ?? null
    const row = (assignee && rowMap.get(assignee.resourceId)) ?? unassignedRow
    const startDayKey = toPlannerDayKey(task.startDayUtc)

    row.tasks.push({
      id: task.id,
      taskId: task.id,
      title: task.name,
      color: task.color,
      segmentName: task.segmentId
        ? (segmentNames.get(task.segmentId) ?? null)
        : null,
      assigneeName: assignee?.resourceName ?? null,
      progressPercent:
        typeof task.taskProgressPercent === 'number'
          ? task.taskProgressPercent
          : null,
      durationDays: task.durationDays,
      startDayKey,
      startColumn: getTaskStartColumn(
        startDayKey,
        options.renderedWindowStartDayKey,
      ),
      columnSpan: getTaskColumnSpan(task.durationDays),
      laneIndex: 0,
      conflictCount: relations.conflictsByTaskId[task.id].length,
    })
  }

  for (const row of rowMap.values()) {
    row.tasks.sort(sortTasksByLogicalPlacement)
    assignLaneIndexes(row)
    row.taskCount = row.tasks.length
  }

  unassignedRow.tasks.sort(sortTasksByLogicalPlacement)
  assignLaneIndexes(unassignedRow)
  unassignedRow.taskCount = unassignedRow.tasks.length

  const rows: PlannerBoardRowViewModel[] = []

  if (unassignedRow.taskCount > 0) {
    rows.push(unassignedRow)
  }

  for (const resourceId of resourceOrder) {
    const row = rowMap.get(resourceId)

    if (row && row.taskCount > 0) {
      rows.push(row)
    }
  }

  rows.forEach((row, rowIndex) => {
    row.rowIndex = rowIndex
  })

  return rows
}

function assignLaneIndexes(row: PlannerBoardRowViewModel): void {
  if (row.tasks.length === 0) {
    row.laneCount = 1
    return
  }

  const laneEndColumns: number[] = []

  for (const task of row.tasks) {
    const taskEndColumn = task.startColumn + task.columnSpan - 1
    let assignedLaneIndex = -1

    for (let laneIndex = 0; laneIndex < laneEndColumns.length; laneIndex += 1) {
      if (task.startColumn > laneEndColumns[laneIndex]) {
        assignedLaneIndex = laneIndex
        break
      }
    }

    if (assignedLaneIndex === -1) {
      assignedLaneIndex = laneEndColumns.length
      laneEndColumns.push(taskEndColumn)
    } else {
      laneEndColumns[assignedLaneIndex] = taskEndColumn
    }

    task.laneIndex = assignedLaneIndex
  }

  row.laneCount = laneEndColumns.length
}
