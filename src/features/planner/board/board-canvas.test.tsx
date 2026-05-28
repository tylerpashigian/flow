// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { formatPlannerLabel } from '@/lib/date'
import { PlannerBoardCanvas } from './board-canvas'
import type { PlannerBoardRowViewModel } from './board-view'

const columns = [
  { key: 'day-1', dayKey: 20543, start: 0 },
  { key: 'day-2', dayKey: 20544, start: 160 },
]

const rows: PlannerBoardRowViewModel[] = [
  {
    id: 'unassigned',
    label: 'Unassigned',
    picture: null,
    rowIndex: 0,
    laneCount: 1,
    taskCount: 1,
    tasks: [
      {
        id: 'task_1',
        taskId: 'task_1',
        title: 'Task 1',
        color: 'BLUE',
        segmentName: 'Sprint 1',
        assigneeName: null,
        progressPercent: 30,
        durationDays: 2,
        startDayKey: 20543,
        startColumn: 1,
        columnSpan: 2,
        laneIndex: 0,
        conflictCount: 2,
      },
    ],
  },
]

describe('planner board canvas', () => {
  test('renders loading state', () => {
    render(
      <PlannerBoardCanvas
        boardRows={[]}
        columns={columns}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20543}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading
        error={null}
      />,
    )

    expect(screen.queryByText('Loading planner board...')).not.toBeNull()
  })

  test('renders empty state when no board rows are present', () => {
    render(
      <PlannerBoardCanvas
        boardRows={[]}
        columns={columns}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20543}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading={false}
        error={null}
      />,
    )

    expect(
      screen.queryByText('No tasks are scheduled in the current board window.'),
    ).not.toBeNull()
  })

  test('renders persisted task card content and conflict indicator', () => {
    render(
      <PlannerBoardCanvas
        boardRows={rows}
        columns={columns}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20543}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading={false}
        error={null}
      />,
    )

    expect(screen.queryByText('Task 1')).not.toBeNull()
    expect(screen.queryByText('Sprint 1')).not.toBeNull()
    expect(screen.queryByText('30%')).not.toBeNull()
    expect(screen.queryByText('2 conflicts')).not.toBeNull()
  })

  test('places task cards from logical grid inputs', () => {
    const { container } = render(
      <PlannerBoardCanvas
        boardRows={rows}
        columns={columns}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20543}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading={false}
        error={null}
      />,
    )

    const taskCard = within(container).getByText('Task 1').parentElement

    expect(taskCard?.style.gridColumn).toBe('1 / span 2')
    expect(taskCard?.style.gridRow).toBe('1')
  })

  test('styles overflow columns differently from the core board window', () => {
    const { container } = render(
      <PlannerBoardCanvas
        boardRows={rows}
        columns={[
          { key: 'overflow-day', dayKey: 20542, start: 0 },
          { key: 'core-day', dayKey: 20543, start: 160 },
        ]}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20550}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading={false}
        error={null}
      />,
    )

    const scopedQueries = within(container)
    const overflowHeader = scopedQueries.getByText(
      formatPlannerLabel(20542),
    ).parentElement
    const coreHeader = scopedQueries.getByText(
      formatPlannerLabel(20543),
    ).parentElement

    expect(overflowHeader?.className).toContain('bg-slate-100')
    expect(coreHeader?.className).toContain('bg-muted/80')
  })

  test('stacks overlapping tasks in separate grid rows within the same resource row', () => {
    const { container } = render(
      <PlannerBoardCanvas
        boardRows={[
          {
            id: 'resource_1',
            label: 'Alex',
            picture: null,
            rowIndex: 0,
            laneCount: 2,
            taskCount: 2,
            tasks: [
              {
                id: 'task_a',
                taskId: 'task_a',
                title: 'Task A',
                color: 'BLUE',
                segmentName: null,
                assigneeName: 'Alex',
                progressPercent: null,
                durationDays: 2,
                startDayKey: 20543,
                startColumn: 1,
                columnSpan: 2,
                laneIndex: 0,
                conflictCount: 0,
              },
              {
                id: 'task_b',
                taskId: 'task_b',
                title: 'Task B',
                color: 'AMBER',
                segmentName: null,
                assigneeName: 'Alex',
                progressPercent: null,
                durationDays: 2,
                startDayKey: 20543,
                startColumn: 1,
                columnSpan: 2,
                laneIndex: 1,
                conflictCount: 0,
              },
            ],
          },
        ]}
        columns={columns}
        dayWidth={160}
        totalTimelineWidth={320}
        scrollRef={createRef<HTMLDivElement>()}
        todayDayKey={20543}
        coreWindowStartDayKey={20543}
        coreWindowEndDayKey={20544}
        isLoading={false}
        error={null}
      />,
    )

    const taskACard = within(container).getByText('Task A').parentElement
    const taskBCard = within(container).getByText('Task B').parentElement

    expect(taskACard?.style.gridRow).toBe('1')
    expect(taskBCard?.style.gridRow).toBe('2')
  })
})
