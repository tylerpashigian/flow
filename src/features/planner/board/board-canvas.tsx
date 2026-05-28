import type { RefObject } from 'react'
import { formatPlannerLabel, formatPlannerMonthLabel } from '@/lib/date'
import type { PlannerDayKey } from '@/types/date'
import { cn } from '@/lib/utils'
import type { PlannerBoardRowViewModel } from './board-view'
import {
  PLANNER_HEADER_HEIGHT,
  PLANNER_LANE_GAP,
  PLANNER_LANE_HEIGHT,
  PLANNER_ROW_LABEL_WIDTH,
  PLANNER_ROW_VERTICAL_PADDING,
} from './board-view'

export interface PlannerBoardCanvasColumn {
  key: string
  dayKey: PlannerDayKey
  start: number
}

const taskColorClasses: Record<
  PlannerBoardRowViewModel['tasks'][number]['color'],
  string
> = {
  SLATE: 'border-slate-300 bg-slate-100 text-slate-900',
  BLUE: 'border-blue-300 bg-blue-100 text-blue-900',
  GREEN: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  AMBER: 'border-amber-300 bg-amber-100 text-amber-900',
  ROSE: 'border-rose-300 bg-rose-100 text-rose-900',
  VIOLET: 'border-violet-300 bg-violet-100 text-violet-900',
}

export function PlannerBoardCanvas({
  boardRows,
  columns,
  dayWidth,
  totalTimelineWidth,
  scrollRef,
  todayDayKey,
  coreWindowStartDayKey,
  coreWindowEndDayKey,
  isLoading,
  error,
}: {
  boardRows: PlannerBoardRowViewModel[]
  columns: PlannerBoardCanvasColumn[]
  dayWidth: number
  totalTimelineWidth: number
  scrollRef: RefObject<HTMLDivElement | null>
  todayDayKey: PlannerDayKey
  coreWindowStartDayKey: PlannerDayKey
  coreWindowEndDayKey: PlannerDayKey
  isLoading: boolean
  error: Error | null
}) {
  if (isLoading) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading planner board...
      </p>
    )
  }

  if (error) {
    return (
      <p className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error.message}
      </p>
    )
  }

  if (boardRows.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No tasks are scheduled in the current board window.
      </p>
    )
  }

  const rowHeights = boardRows.map((row) => getPlannerRowHeight(row.laneCount))
  const rowTops: number[] = []
  let currentTop = PLANNER_HEADER_HEIGHT

  for (const rowHeight of rowHeights) {
    rowTops.push(currentTop)
    currentTop += rowHeight
  }

  const totalHeight = currentTop

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div
        className="relative"
        style={{
          width: PLANNER_ROW_LABEL_WIDTH + totalTimelineWidth,
          height: totalHeight,
        }}
      >
        <div
          className="sticky top-0 z-30 h-12"
          style={{
            height: PLANNER_HEADER_HEIGHT,
          }}
        >
          <div className="relative h-full w-full">
            <div
              className="sticky left-0 top-0 z-40 border-r border-b bg-card px-4 py-2"
              style={{
                width: PLANNER_ROW_LABEL_WIDTH,
                height: PLANNER_HEADER_HEIGHT,
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resource
              </span>
            </div>

            <div
              className="absolute top-0"
              style={{
                left: PLANNER_ROW_LABEL_WIDTH,
                width: totalTimelineWidth,
                height: PLANNER_HEADER_HEIGHT,
              }}
            >
              <div className="relative h-full w-full">
                {columns.map((column) => {
                  const isToday = column.dayKey === todayDayKey
                  const isOverflowDay =
                    column.dayKey < coreWindowStartDayKey ||
                    column.dayKey > coreWindowEndDayKey

                  return (
                    <div
                      key={`header-${column.key}`}
                      className={cn(
                        'absolute top-0 border-r border-b px-3 py-2 text-xs',
                        isToday
                          ? 'bg-blue-100 text-blue-900'
                          : isOverflowDay
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-muted/80',
                      )}
                      style={{
                        left: column.start,
                        width: dayWidth,
                        height: PLANNER_HEADER_HEIGHT,
                      }}
                    >
                      <p className="font-semibold">
                        {formatPlannerLabel(column.dayKey)}
                      </p>
                      <p className="text-xs opacity-70">
                        {formatPlannerMonthLabel(column.dayKey)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {columns.map((column) => {
          const isOverflowDay =
            column.dayKey < coreWindowStartDayKey ||
            column.dayKey > coreWindowEndDayKey

          return (
            <div
              key={column.key}
              className="absolute top-0 border-r border-border"
              style={{
                width: dayWidth,
                height: totalHeight,
                transform: `translateX(${PLANNER_ROW_LABEL_WIDTH + column.start}px)`,
              }}
            >
              <div
                className={cn(
                  'h-[calc(100%-48px)]',
                  isOverflowDay ? 'bg-slate-100/50' : 'bg-background/50',
                )}
                style={{ marginTop: PLANNER_HEADER_HEIGHT }}
              />
            </div>
          )
        })}

        {boardRows.map((row, rowIndex) => {
          const rowTop = rowTops[rowIndex]
          const rowHeight = rowHeights[rowIndex]

          return (
            <div
              key={row.id}
              className="absolute left-0 right-0 border-b border-border/60"
              style={{
                top: rowTop,
                height: rowHeight,
              }}
            >
              <div
                className="sticky left-0 z-20 flex h-full flex-col justify-center gap-1 border-r bg-card px-4"
                style={{ width: PLANNER_ROW_LABEL_WIDTH }}
              >
                <p className="truncate text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">
                  {row.taskCount} {row.taskCount === 1 ? 'task' : 'tasks'}
                </p>
              </div>

              <div
                className="absolute inset-y-0 grid items-stretch"
                style={{
                  left: PLANNER_ROW_LABEL_WIDTH,
                  width: totalTimelineWidth,
                  gridTemplateColumns: `repeat(${columns.length}, ${dayWidth}px)`,
                  gridTemplateRows: `repeat(${row.laneCount}, ${PLANNER_LANE_HEIGHT}px)`,
                  rowGap: PLANNER_LANE_GAP,
                  paddingTop: PLANNER_ROW_VERTICAL_PADDING,
                  paddingBottom: PLANNER_ROW_VERTICAL_PADDING,
                }}
              >
                {row.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'overflow-hidden rounded-lg border px-3 py-2 shadow-sm',
                      taskColorClasses[task.color],
                    )}
                    style={{
                      gridColumn: `${task.startColumn} / span ${task.columnSpan}`,
                      gridRow: String(task.laneIndex + 1),
                      minWidth: Math.max(task.columnSpan * dayWidth, 144),
                    }}
                  >
                    <h3 className="truncate text-sm font-semibold">
                      {task.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
                      {task.segmentName ? (
                        <span>{task.segmentName}</span>
                      ) : null}
                      {task.assigneeName ? (
                        <span>{task.assigneeName}</span>
                      ) : null}
                      {typeof task.progressPercent === 'number' ? (
                        <span>{task.progressPercent}%</span>
                      ) : null}
                    </div>
                    {task.conflictCount > 0 ? (
                      <p className="mt-2 text-xs font-medium text-rose-700">
                        {task.conflictCount}{' '}
                        {task.conflictCount === 1 ? 'conflict' : 'conflicts'}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getPlannerRowHeight(laneCount: number): number {
  return (
    laneCount * PLANNER_LANE_HEIGHT +
    Math.max(0, laneCount - 1) * PLANNER_LANE_GAP +
    PLANNER_ROW_VERTICAL_PADDING * 2
  )
}
