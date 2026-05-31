import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { PlannerDayKey } from '../types/date'

const EPOCH_DAY = startOfDay(new Date(0))
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toPlannerDayKey(date: Date): PlannerDayKey {
  return differenceInCalendarDays(startOfDay(date), EPOCH_DAY)
}

export function fromPlannerDayKey(dayKey: PlannerDayKey): Date {
  return addDays(EPOCH_DAY, dayKey)
}

export function formatPlannerDay(dayKey: PlannerDayKey): string {
  return format(fromPlannerDayKey(dayKey), 'yyyy-MM-dd')
}

export function parsePlannerDay(value?: string): PlannerDayKey | null {
  if (!value || !ISO_DAY_PATTERN.test(value)) {
    return null
  }

  const parsed = parseISO(value)

  if (!isValid(parsed)) {
    return null
  }

  return toPlannerDayKey(parsed)
}

export function formatPlannerLabel(dayKey: PlannerDayKey): string {
  return format(fromPlannerDayKey(dayKey), 'EEE, MMM d')
}

export function formatPlannerMonthLabel(dayKey: PlannerDayKey): string {
  return format(fromPlannerDayKey(dayKey), 'MMM yyyy')
}
