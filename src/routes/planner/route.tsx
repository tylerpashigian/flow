import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import {
  hasExplicitPlannerBoardWindow,
  hasPlannerBoardWindowParams,
} from '@/features/planner/board/board-window'

const searchSchema = z.object({
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
})

export const Route = createFileRoute('/planner')({
  validateSearch: searchSchema,
  loader: async () => {
    return {
      // TODO: add authentication and load real user data here
    }
  },
  component: PlannerLayout,
})

export const PlannerLayoutRoute = Route

function PlannerLayout() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

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

  return <Outlet />
}
