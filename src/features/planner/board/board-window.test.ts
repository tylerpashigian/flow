import { describe, expect, test } from 'vitest'
import { fromPlannerDayKey } from '@/lib/date'
import {
  expandPlannerBoardWindow,
  getDefaultPlannerBoardWindow,
  getPlannerBoardVisibleDayKeys,
  getRenderedPlannerBoardWindow,
  hasExplicitPlannerBoardWindow,
  hasPlannerBoardWindowParams,
  normalizePlannerBoardWindowSearch,
  shouldAutoCenterPlannerBoardToday,
  toPlannerBoardWindowSearch,
} from './board-window'

describe('planner board window', () => {
  test('defaults to today plus and minus 14 days', () => {
    expect(getDefaultPlannerBoardWindow(20550)).toEqual({
      windowStartDayKey: 20536,
      windowEndDayKey: 20564,
    })
  })

  test('normalizes invalid search values back to the default window', () => {
    expect(
      normalizePlannerBoardWindowSearch(
        { windowStart: 'bad', windowEnd: '2026-04-10' },
        20550,
      ),
    ).toEqual({
      windowStartDayKey: 20536,
      windowEndDayKey: 20564,
    })
  })

  test('uses explicit search dates when both are valid', () => {
    const normalized = normalizePlannerBoardWindowSearch(
      { windowStart: '2026-04-01', windowEnd: '2026-04-29' },
      20550,
    )

    expect(toPlannerBoardWindowSearch(normalized)).toEqual({
      windowStart: '2026-04-01',
      windowEnd: '2026-04-29',
    })
  })

  test('distinguishes present params from a valid explicit window', () => {
    expect(hasPlannerBoardWindowParams({})).toBe(false)
    expect(hasExplicitPlannerBoardWindow({})).toBe(false)

    expect(hasPlannerBoardWindowParams({ windowStart: '2026-04-01' })).toBe(
      true,
    )
    expect(hasExplicitPlannerBoardWindow({ windowStart: '2026-04-01' })).toBe(
      false,
    )

    expect(
      hasExplicitPlannerBoardWindow({
        windowStart: '2026-04-10',
        windowEnd: '2026-04-01',
      }),
    ).toBe(false)

    expect(
      hasExplicitPlannerBoardWindow({
        windowStart: '2026-04-01',
        windowEnd: '2026-04-29',
      }),
    ).toBe(true)
  })

  test('expands the board window on either side by 14 days', () => {
    const initialWindow = {
      windowStartDayKey: 20536,
      windowEndDayKey: 20564,
    }

    expect(expandPlannerBoardWindow(initialWindow, 'before')).toEqual({
      windowStartDayKey: 20522,
      windowEndDayKey: 20564,
    })
    expect(expandPlannerBoardWindow(initialWindow, 'after')).toEqual({
      windowStartDayKey: 20536,
      windowEndDayKey: 20578,
    })
  })

  test('returns a finite visible day range for the active window', () => {
    expect(
      getPlannerBoardVisibleDayKeys({
        windowStartDayKey: 10,
        windowEndDayKey: 12,
      }),
    ).toEqual([10, 11, 12])
  })

  test('expands the rendered window to fully include overlapping task bounds', () => {
    expect(
      getRenderedPlannerBoardWindow(
        {
          windowStartDayKey: 20536,
          windowEndDayKey: 20564,
        },
        [
          {
            startUtc: fromPlannerDayKey(20544),
            durationDays: 4,
          },
          {
            startUtc: fromPlannerDayKey(20571),
            durationDays: 3,
          },
        ],
      ),
    ).toEqual({
      windowStartDayKey: 20536,
      windowEndDayKey: 20573,
    })
  })

  test('extends the rendered window earlier when an overlapping task starts before the core range', () => {
    expect(
      getRenderedPlannerBoardWindow(
        {
          windowStartDayKey: 20536,
          windowEndDayKey: 20564,
        },
        [
          {
            startUtc: fromPlannerDayKey(20532),
            durationDays: 8,
          },
        ],
      ),
    ).toEqual({
      windowStartDayKey: 20532,
      windowEndDayKey: 20564,
    })
  })

  test('auto-centers on today only for the implicit default window', () => {
    expect(
      shouldAutoCenterPlannerBoardToday({
        hasExplicitWindow: false,
        todayDayKey: 20550,
        renderedWindow: {
          windowStartDayKey: 20536,
          windowEndDayKey: 20564,
        },
      }),
    ).toBe(true)

    expect(
      shouldAutoCenterPlannerBoardToday({
        hasExplicitWindow: true,
        todayDayKey: 20550,
        renderedWindow: {
          windowStartDayKey: 20536,
          windowEndDayKey: 20564,
        },
      }),
    ).toBe(false)
  })
})
