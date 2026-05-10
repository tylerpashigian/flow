export interface ResourceModel {
  id: string
  planId: string
  userId: string | null
  name: string
  picture: string | null
  capacityPercent: number
  timezone: string
  workdayStartMinuteLocal: number
  workdayEndMinuteLocal: number
  createdAt: Date
  updatedAt: Date
}

export interface ResourceFormModel {
  name: string
}
