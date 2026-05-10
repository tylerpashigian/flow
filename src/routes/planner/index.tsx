import { useVirtualizer } from '@tanstack/react-virtual'
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatPlannerDay,
  formatPlannerLabel,
  formatPlannerMonthLabel,
  fromPlannerDayKey,
  getTodayPlannerDayKey,
  parsePlannerDay,
} from '@/lib/date'
import type { PlannerDayKey } from '@/types/date'
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
import { PlannerLayoutRoute } from './route'

const DAY_WIDTH = 160
const WINDOW_DAY_COUNT = 2001
const CENTER_INDEX = Math.floor(WINDOW_DAY_COUNT / 2)
const EDGE_THRESHOLD = 250
const plannerRouteApi = getRouteApi('/planner')

export const Route = createFileRoute('/planner/')({
  component: PlannerTimeline,
})

function PlannerTimeline() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = plannerRouteApi.useSearch()
  const { sidebarData } = PlannerLayoutRoute.useLoaderData()

  const todayDayKey = getTodayPlannerDayKey()
  const parsedSearchDay = useMemo(
    () => parsePlannerDay(search.date),
    [search.date],
  )
  const normalizedDay = parsedSearchDay ?? todayDayKey
  const normalizedDateString = formatPlannerDay(normalizedDay)
  const bootstrap = usePlannerBootstrap()
  const activePlan = bootstrap.activePlan
  const activePlanId = activePlan?.id ?? 'pending-plan'

  const parentRef = useRef<HTMLDivElement | null>(null)
  const isRecenteringRef = useRef(false)
  const lastAppliedDateRef = useRef(normalizedDateString)
  const [baseDayKey, setBaseDayKey] = useState<PlannerDayKey>(
    () => normalizedDay,
  )

  const recenterToMiddle = useCallback(() => {
    const container = parentRef.current

    if (!container) {
      return
    }

    const centeredScrollLeft =
      CENTER_INDEX * DAY_WIDTH + DAY_WIDTH / 2 - container.clientWidth / 2
    container.scrollLeft = Math.max(0, centeredScrollLeft)
  }, [])

  const virtualizer = useVirtualizer({
    count: WINDOW_DAY_COUNT,
    getScrollElement: () => parentRef.current,
    horizontal: true,
    estimateSize: () => DAY_WIDTH,
    overscan: 8,
  })

  useEffect(() => {
    recenterToMiddle()
  }, [recenterToMiddle])

  useEffect(() => {
    if (lastAppliedDateRef.current === normalizedDateString) {
      return
    }

    lastAppliedDateRef.current = normalizedDateString
    setBaseDayKey(normalizedDay)
    recenterToMiddle()
  }, [normalizedDateString, normalizedDay, recenterToMiddle])

  useEffect(() => {
    const container = parentRef.current

    if (!container) {
      return
    }

    const onScroll = () => {
      if (isRecenteringRef.current) {
        return
      }

      const centerPx = container.scrollLeft + container.clientWidth / 2
      const centeredIndex = Math.floor(centerPx / DAY_WIDTH)

      if (
        centeredIndex > EDGE_THRESHOLD &&
        centeredIndex < WINDOW_DAY_COUNT - EDGE_THRESHOLD
      ) {
        return
      }

      const delta = centeredIndex - CENTER_INDEX

      if (delta === 0) {
        return
      }

      const centerOffsetInCell =
        centerPx - (centeredIndex * DAY_WIDTH + DAY_WIDTH / 2)

      isRecenteringRef.current = true
      setBaseDayKey((previous) => previous + delta)

      const recenteredCenterPx =
        CENTER_INDEX * DAY_WIDTH + DAY_WIDTH / 2 + centerOffsetInCell
      container.scrollLeft = Math.max(
        0,
        recenteredCenterPx - container.clientWidth / 2,
      )

      requestAnimationFrame(() => {
        isRecenteringRef.current = false
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [])

  const virtualItems = virtualizer.getVirtualItems()

  const jumpToToday = () => {
    const todayKey = getTodayPlannerDayKey()
    const todayDateString = formatPlannerDay(todayKey)

    lastAppliedDateRef.current = todayDateString
    setBaseDayKey(todayKey)
    recenterToMiddle()

    navigate({
      to: '/planner',
      replace: true,
      search: () => ({
        date: todayDateString,
      }),
    })
  }

  const boardWindow = useMemo(
    () => ({
      planId: activePlanId,
      windowStartUtc: fromPlannerDayKey(baseDayKey - CENTER_INDEX),
      windowEndUtc: fromPlannerDayKey(baseDayKey + CENTER_INDEX + 1),
    }),
    [activePlanId, baseDayKey],
  )
  const plannerBoard = usePlannerBoard(boardWindow, {
    enabled: Boolean(activePlan),
  })

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-3"
      id="planner-content"
    >
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Planner</h1>
          <p className="text-sm text-muted-foreground">
            Infinite virtualized day timeline anchored to{' '}
            {formatPlannerDay(baseDayKey)}.
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
                defaultStartDate={fromPlannerDayKey(baseDayKey)}
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
          <Button onClick={jumpToToday}>Jump to today</Button>
        </div>
      </div>

      {bootstrap.status.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {bootstrap.status.error.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card flex-1 min-h-0">
        <div
          ref={parentRef}
          className="h-full overflow-x-auto overflow-y-hidden"
        >
          <div
            className="relative h-full"
            style={{
              width: virtualizer.getTotalSize(),
            }}
          >
            {virtualItems.map((virtualItem) => {
              const dayKey = baseDayKey + (virtualItem.index - CENTER_INDEX)
              const isToday = dayKey === todayDayKey

              return (
                <div
                  key={virtualItem.key}
                  className="absolute top-0 h-full border-r border-border"
                  style={{
                    width: DAY_WIDTH,
                    transform: `translateX(${virtualItem.start}px)`,
                  }}
                >
                  <div
                    className={`sticky top-0 border-b px-3 py-2 text-xs ${
                      isToday ? 'bg-blue-100 text-blue-900' : 'bg-muted/80'
                    }`}
                  >
                    <div className="font-semibold">
                      {formatPlannerLabel(dayKey)}
                    </div>
                    <div className="text-[11px] opacity-70">
                      {formatPlannerMonthLabel(dayKey)}
                    </div>
                  </div>
                  <div className="h-[calc(100%-48px)] bg-background/50" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
