import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import { SidebarLayout } from '@/components/sidebar-layout'
import type { SidebarData } from '@/components/sidebar-layout'
import {
  hasExplicitPlannerBoardWindow,
  hasPlannerBoardWindowParams,
} from '@/features/planner/board/board-window'

const searchSchema = z.object({
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
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

  useEffect(() => {
    if (
      hasPlannerBoardWindowParams(search) &&
      !hasExplicitPlannerBoardWindow(search)
    ) {
      navigate({
        to: '/planner',
        replace: true,
        search: () => ({}),
      })
    }
  }, [navigate, search])

  return <SidebarLayout sidebarData={sidebarData} content={<Outlet />} />
}
