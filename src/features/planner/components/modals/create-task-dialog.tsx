import { useState } from 'react'
import { toast } from 'sonner'
import { createDefaultTaskFormModel } from '#/data/planner'
import type { ResourceModel, SegmentModel, TaskFormModel } from '#/data/planner'
import { Button } from '@/components/ui/button'
import { TaskDialog } from './task-dialog'

export function CreateTaskDialog({
  defaultStartDate,
  onSubmit,
  resources,
  segments,
}: {
  defaultStartDate: Date
  onSubmit: (value: TaskFormModel) => Promise<string | void>
  resources: ResourceModel[]
  segments: SegmentModel[]
}) {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setResetKey((current) => current + 1)
    }
  }

  return (
    <TaskDialog
      trigger={<Button>Create task</Button>}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`create-task-${resetKey}`}
      title="Create task"
      description="Add a scheduled task to the current plan."
      submitLabel="Create task"
      defaultValues={createDefaultTaskFormModel(defaultStartDate)}
      resources={resources}
      segments={segments}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Task created',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to create task',
          )
          throw error
        }
      }}
    />
  )
}
