import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from '@tanstack/react-router'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  formatPlannerDay,
  fromPlannerDayKey,
  toPlannerDayKey,
} from '@/lib/date'
import { Button } from '@/components/ui/button'
import {
  toCreateResourceInput,
  toCreateSegmentInput,
  toCreateTaskInput,
  toOptionalTaskAssignmentInput,
} from '#/data/planner'
import {
  CreateResourceDialog,
  CreateSegmentDialog,
  CreateTaskDialog,
} from '@/features/planner/components/modals'
import { usePlannerBoard, usePlannerBootstrap } from '@/features/planner/hooks'
import { PlannerBoardCanvas } from '@/features/planner/board/board-canvas'
import {
  buildPlannerBoardRows,
  PLANNER_ROW_LABEL_WIDTH,
} from '@/features/planner/board/board-view'
import {
  expandPlannerBoardWindow,
  getPlannerBoardVisibleDayKeys,
  getRenderedPlannerBoardWindow,
  hasExplicitPlannerBoardWindow,
  normalizePlannerBoardWindowSearch,
  shouldAutoCenterPlannerBoardToday,
  toPlannerBoardWindowSearch,
} from '@/features/planner/board/board-window'
import { PlannerLayoutRoute } from './route'

const DAY_WIDTH = 160
const plannerRouteApi = getRouteApi('/planner')

export const Route = createFileRoute('/planner/')({
  component: PlannerTimeline,
})

function PlannerTimeline() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = plannerRouteApi.useSearch()
  const { sidebarData } = PlannerLayoutRoute.useLoaderData()

  const todayDayKey = toPlannerDayKey(new Date())
  const hasExplicitWindow = hasExplicitPlannerBoardWindow(search)
  const activeWindow = useMemo(
    () => normalizePlannerBoardWindowSearch(search, todayDayKey),
    [search, todayDayKey],
  )
  const bootstrap = usePlannerBootstrap()
  const activePlan = bootstrap.activePlan
  const activePlanId = activePlan?.id ?? 'pending-plan'
  const parentRef = useRef<HTMLDivElement | null>(null)
  const lastAutoScrollKeyRef = useRef<string | null>(null)

  const expandWindow = (direction: 'before' | 'after') => {
    navigate({
      to: '/planner',
      replace: true,
      search: () =>
        toPlannerBoardWindowSearch(
          expandPlannerBoardWindow(activeWindow, direction),
        ),
    })
  }

  const boardWindow = useMemo(
    () => ({
      planId: activePlanId,
      windowStartUtc: fromPlannerDayKey(activeWindow.windowStartDayKey),
      windowEndUtc: fromPlannerDayKey(activeWindow.windowEndDayKey + 1),
    }),
    [activePlanId, activeWindow],
  )
  const plannerBoard = usePlannerBoard(boardWindow, {
    enabled: Boolean(activePlan),
  })
  const isBoardLoading =
    bootstrap.status.isLoading || plannerBoard.status.isLoading
  const renderedWindow = useMemo(
    () =>
      plannerBoard.board
        ? getRenderedPlannerBoardWindow(activeWindow, plannerBoard.board.tasks)
        : activeWindow,
    [activeWindow, plannerBoard.board],
  )
  const boardRows = useMemo(
    () =>
      plannerBoard.board
        ? buildPlannerBoardRows(plannerBoard.board, plannerBoard.relations, {
            renderedWindowStartDayKey: renderedWindow.windowStartDayKey,
          })
        : [],
    [
      renderedWindow.windowStartDayKey,
      plannerBoard.board,
      plannerBoard.relations,
    ],
  )
  const visibleDayKeys = useMemo(
    () => getPlannerBoardVisibleDayKeys(renderedWindow),
    [renderedWindow],
  )
  const columns = useMemo(
    () =>
      visibleDayKeys.map((dayKey, index) => ({
        key: formatPlannerDay(dayKey),
        dayKey,
        start: index * DAY_WIDTH,
      })),
    [visibleDayKeys],
  )
  const totalTimelineWidth = columns.length * DAY_WIDTH
  const shouldScrollToToday = shouldAutoCenterPlannerBoardToday({
    hasExplicitWindow,
    todayDayKey,
    renderedWindow,
  })
  const initialScrollKey = shouldScrollToToday
    ? `${activeWindow.windowStartDayKey}-${activeWindow.windowEndDayKey}-${renderedWindow.windowStartDayKey}-${renderedWindow.windowEndDayKey}`
    : null

  useLayoutEffect(() => {
    if (
      initialScrollKey === null ||
      isBoardLoading ||
      lastAutoScrollKeyRef.current === initialScrollKey
    ) {
      return
    }

    const container = parentRef.current

    if (!container) {
      return
    }

    const todayIndex = todayDayKey - renderedWindow.windowStartDayKey

    if (todayIndex < 0 || todayIndex >= columns.length) {
      return
    }

    const targetScrollLeft = Math.max(
      0,
      PLANNER_ROW_LABEL_WIDTH +
        todayIndex * DAY_WIDTH +
        DAY_WIDTH / 2 -
        container.clientWidth / 2,
    )

    container.scrollLeft = targetScrollLeft
    lastAutoScrollKeyRef.current = initialScrollKey
  }, [
    columns.length,
    initialScrollKey,
    isBoardLoading,
    renderedWindow.windowStartDayKey,
    todayDayKey,
  ])

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-3"
      id="planner-content"
    >
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Planner</h1>
          <p className="text-sm text-muted-foreground">
            Showing {formatPlannerDay(activeWindow.windowStartDayKey)} through{' '}
            {formatPlannerDay(activeWindow.windowEndDayKey)}.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as {sidebarData.user.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Active plan:{' '}
            {bootstrap.status.isLoading
              ? 'Loading...'
              : (activePlan?.name ?? 'Unavailable')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {activePlan ? (
            <>
              <CreateResourceDialog
                onSubmit={async (value) => {
                  await plannerBoard.actions.createResource(
                    toCreateResourceInput(value, activePlan.id),
                  )
                }}
              />
              <CreateSegmentDialog
                onSubmit={async (value) => {
                  await plannerBoard.actions.createSegment(
                    toCreateSegmentInput(value, activePlan.id),
                  )
                }}
              />
              <CreateTaskDialog
                segments={bootstrap.segments}
                resources={bootstrap.resources}
                defaultStartDate={new Date()}
                onSubmit={async (value) => {
                  const task = await plannerBoard.actions.createTask(
                    toCreateTaskInput(value, activePlan.id),
                  )
                  const assignmentInput = toOptionalTaskAssignmentInput(
                    value,
                    task.id,
                  )

                  if (!assignmentInput) {
                    return 'Task created'
                  }

                  try {
                    await plannerBoard.actions.addAssignment(assignmentInput)
                  } catch (error) {
                    throw new Error(
                      error instanceof Error
                        ? error.message
                        : 'Task created, but resource assignment failed',
                    )
                  }

                  return 'Task created and assigned'
                }}
              />
            </>
          ) : null}
          <Button variant="outline" onClick={() => expandWindow('before')}>
            Load 2 more weeks before
          </Button>
          <Button variant="outline" onClick={() => expandWindow('after')}>
            Load 2 more weeks after
          </Button>
        </div>
      </div>

      {bootstrap.status.error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {bootstrap.status.error.message}
        </p>
      ) : null}

      <div className="rounded-lg border bg-card flex-1 min-h-0">
        <PlannerBoardCanvas
          boardRows={boardRows}
          columns={columns}
          dayWidth={DAY_WIDTH}
          totalTimelineWidth={totalTimelineWidth}
          scrollRef={parentRef}
          todayDayKey={todayDayKey}
          coreWindowStartDayKey={activeWindow.windowStartDayKey}
          coreWindowEndDayKey={activeWindow.windowEndDayKey}
          isLoading={isBoardLoading}
          error={bootstrap.status.error ?? plannerBoard.status.error}
        />
      </div>
    </div>
  )
}
