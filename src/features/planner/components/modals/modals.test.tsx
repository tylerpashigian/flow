// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { ResourceModel, SegmentModel } from '#/data/planner'
import { ResourceDialog } from './resource-dialog'
import { TaskDialog } from './task-dialog'

const resources: ResourceModel[] = [
  {
    id: 'resource_1',
    planId: 'plan_1',
    userId: null,
    name: 'John Appleseed',
    picture: null,
    capacityPercent: 100,
    timezone: 'UTC',
    workdayStartMinuteLocal: 0,
    workdayEndMinuteLocal: 1440,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  },
]

const segments: SegmentModel[] = [
  {
    id: 'segment_1',
    planId: 'plan_1',
    name: 'Sprint 1',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  },
]

describe('planner modals', () => {
  test('ResourceDialog submits form values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <ResourceDialog
        trigger={<button type="button">Open resource dialog</button>}
        open
        onOpenChange={() => {}}
        formKey="resource-dialog-test"
        title="Create resource"
        description="Add resource"
        submitLabel="Create resource"
        defaultValues={{ name: '' }}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Appleseed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create resource' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John Appleseed' })
    })
  })

  test('ResourceDialog shows validation error and clears it on valid change', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <ResourceDialog
        trigger={<button type="button">Open resource dialog</button>}
        open
        onOpenChange={() => {}}
        formKey="resource-dialog-validation-test"
        title="Create resource"
        description="Add resource"
        submitLabel="Create resource"
        defaultValues={{ name: '' }}
        onSubmit={onSubmit}
      />,
    )

    const nameInput = screen.getByLabelText('Name')
    const errorMessage = 'Resource name is required'

    fireEvent.change(nameInput, {
      target: { value: ' ' },
    })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeNull()
    })

    fireEvent.change(nameInput, {
      target: { value: 'John Appleseed' },
    })

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).toBeNull()
    })
  })

  test('TaskDialog shows selected labels and clears optional selects', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TaskDialog
        trigger={<button type="button">Open task dialog</button>}
        open
        onOpenChange={() => {}}
        formKey="task-dialog-test"
        title="Edit task"
        description="Update task"
        submitLabel="Save task"
        defaultValues={{
          title: 'Task 1',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          durationDays: '2',
          segmentId: 'segment_1',
          resourceId: 'resource_1',
        }}
        resources={resources}
        segments={segments}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getAllByText('Sprint 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('John Appleseed').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Clear segment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear resource' }))

    await waitFor(() => {
      expect(screen.getAllByText('No segment').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0)
    })
  })

  test('TaskDialog duration shows blur validation and clears error on valid change', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TaskDialog
        trigger={<button type="button">Open task dialog</button>}
        open
        onOpenChange={() => {}}
        formKey="task-dialog-duration-validation-test"
        title="Edit task"
        description="Update task"
        submitLabel="Save task"
        defaultValues={{
          title: 'Task 1',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          durationDays: '2',
          segmentId: undefined,
          resourceId: undefined,
        }}
        resources={resources}
        segments={segments}
        onSubmit={onSubmit}
      />,
    )

    const durationInput = screen.getByLabelText('Duration (days)')
    const errorMessage = 'Task duration must be at least 1 day'

    fireEvent.change(durationInput, {
      target: { value: '' },
    })
    fireEvent.blur(durationInput)

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeNull()
    })

    fireEvent.change(durationInput, {
      target: { value: '2' },
    })

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).toBeNull()
    })
  })
})
