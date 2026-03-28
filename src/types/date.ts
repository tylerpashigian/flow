export type PlannerDayKey = number

export interface PlannerTaskDraft {
  id: string
  title: string
  startDay: PlannerDayKey
  durationDays: number
}
