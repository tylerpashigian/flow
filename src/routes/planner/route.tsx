import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import {
  formatPlannerDay,
  getTodayPlannerDayKey,
  parsePlannerDay,
} from '@/lib/date'
import { SidebarLayout, type SidebarData } from '@/components/sidebar-layout'

const searchSchema = z.object({
  date: z.string().optional(),
})

async function loadPlannerSidebarData(): Promise<SidebarData> {
  return {
    user: {
      id: 'sandbox-user-1',
      name: 'Tyler',
    },
    recentItems: [
      { id: 'r1', title: 'Timeline virtualization ideas' },
      { id: 'r2', title: 'Task dependency schema draft' },
      { id: 'r3', title: 'Resource leveling experiment' },
    ],
    projects: [
      { id: 'p1', name: 'Planning Management Tool' },
      { id: 'p2', name: 'Sandbox UI Iterations' },
    ],
  }
}

export const Route = createFileRoute('/planner')({
  validateSearch: searchSchema,
  loader: async () => {
    const sidebarData = await loadPlannerSidebarData()

    return {
      sidebarData,
    }
  },
  component: PlannerLayout,
})

export const PlannerLayoutRoute = Route

function PlannerLayout() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { sidebarData } = Route.useLoaderData()

  const todayDayKey = getTodayPlannerDayKey()
  const parsedSearchDay = useMemo(
    () => parsePlannerDay(search.date),
    [search.date],
  )
  const normalizedDay = parsedSearchDay ?? todayDayKey
  const normalizedDateString = formatPlannerDay(normalizedDay)

  useEffect(() => {
    if (search.date === normalizedDateString) {
      return
    }

    navigate({
      to: '/planner',
      replace: true,
      search: () => ({
        date: normalizedDateString,
      }),
    })
  }, [navigate, normalizedDateString, search.date])

  return <SidebarLayout sidebarData={sidebarData} content={<Outlet />} />
}
