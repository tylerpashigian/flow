import {
  formatPlannerDay,
  parsePlannerDay,
  toPlannerDayKey,
} from '@/lib/date'
import type { PlannerDayKey } from '@/types/date'
import type { TaskModel } from '#/data/planner'

const DEFAULT_WINDOW_PAST_DAYS = 14
const DEFAULT_WINDOW_FUTURE_DAYS = 14
const BOARD_WINDOW_EXPANSION_DAYS = 14

export interface PlannerBoardWindowSearch {
  windowStart?: string
  windowEnd?: string
}

export interface PlannerBoardWindowModel {
  windowStartDayKey: PlannerDayKey
  windowEndDayKey: PlannerDayKey
}

export function hasPlannerBoardWindowParams(
  search: PlannerBoardWindowSearch,
): boolean {
  return search.windowStart !== undefined || search.windowEnd !== undefined
}

export function hasExplicitPlannerBoardWindow(
  search: PlannerBoardWindowSearch,
): boolean {
  const parsedStart = parsePlannerDay(search.windowStart)
  const parsedEnd = parsePlannerDay(search.windowEnd)

  return parsedStart !== null && parsedEnd !== null && parsedStart <= parsedEnd
}

export function getDefaultPlannerBoardWindow(
  todayDayKey: PlannerDayKey,
): PlannerBoardWindowModel {
  return {
    windowStartDayKey: todayDayKey - DEFAULT_WINDOW_PAST_DAYS,
    windowEndDayKey: todayDayKey + DEFAULT_WINDOW_FUTURE_DAYS,
  }
}

export function normalizePlannerBoardWindowSearch(
  search: PlannerBoardWindowSearch,
  todayDayKey: PlannerDayKey,
): PlannerBoardWindowModel {
  const defaultWindow = getDefaultPlannerBoardWindow(todayDayKey)
  const parsedStart = parsePlannerDay(search.windowStart)
  const parsedEnd = parsePlannerDay(search.windowEnd)

  if (parsedStart === null || parsedEnd === null || parsedStart > parsedEnd) {
    return defaultWindow
  }

  return {
    windowStartDayKey: parsedStart,
    windowEndDayKey: parsedEnd,
  }
}

export function toPlannerBoardWindowSearch(
  window: PlannerBoardWindowModel,
): Required<PlannerBoardWindowSearch> {
  return {
    windowStart: formatPlannerDay(window.windowStartDayKey),
    windowEnd: formatPlannerDay(window.windowEndDayKey),
  }
}

export function getPlannerBoardVisibleDayKeys(
  window: PlannerBoardWindowModel,
): PlannerDayKey[] {
  const visibleDayKeys: PlannerDayKey[] = []

  for (
    let dayKey = window.windowStartDayKey;
    dayKey <= window.windowEndDayKey;
    dayKey += 1
  ) {
    visibleDayKeys.push(dayKey)
  }

  return visibleDayKeys
}

export function getRenderedPlannerBoardWindow(
  coreWindow: PlannerBoardWindowModel,
  tasks: Pick<TaskModel, 'startDayUtc' | 'durationDays'>[],
): PlannerBoardWindowModel {
  let renderedStartDayKey = coreWindow.windowStartDayKey
  let renderedEndDayKey = coreWindow.windowEndDayKey

  for (const task of tasks) {
    const taskStartDayKey = toPlannerDayKey(task.startDayUtc)
    const taskEndDayKey = taskStartDayKey + task.durationDays - 1

    if (taskStartDayKey < renderedStartDayKey) {
      renderedStartDayKey = taskStartDayKey
    }

    if (taskEndDayKey > renderedEndDayKey) {
      renderedEndDayKey = taskEndDayKey
    }
  }

  return {
    windowStartDayKey: renderedStartDayKey,
    windowEndDayKey: renderedEndDayKey,
  }
}

export function expandPlannerBoardWindow(
  window: PlannerBoardWindowModel,
  direction: 'before' | 'after',
  days = BOARD_WINDOW_EXPANSION_DAYS,
): PlannerBoardWindowModel {
  if (direction === 'before') {
    return {
      windowStartDayKey: window.windowStartDayKey - days,
      windowEndDayKey: window.windowEndDayKey,
    }
  }

  return {
    windowStartDayKey: window.windowStartDayKey,
    windowEndDayKey: window.windowEndDayKey + days,
  }
}

export function shouldAutoCenterPlannerBoardToday(options: {
  hasExplicitWindow: boolean
  todayDayKey: PlannerDayKey
  renderedWindow: PlannerBoardWindowModel
}): boolean {
  return (
    !options.hasExplicitWindow &&
    options.todayDayKey >= options.renderedWindow.windowStartDayKey &&
    options.todayDayKey <= options.renderedWindow.windowEndDayKey
  )
}
