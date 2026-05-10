import { useState } from 'react'
import { toast } from 'sonner'
import { toTaskFormModel } from '#/data/planner'
import type {
  ResourceModel,
  SegmentModel,
  TaskFormModel,
  TaskModel,
} from '#/data/planner'
import type { ReactElement } from 'react'
import { TaskDialog } from './task-dialog'

export function EditTaskDialog({
  onSubmit,
  resources,
  segments,
  task,
  trigger,
}: {
  onSubmit: (value: TaskFormModel) => Promise<string | void>
  resources: ResourceModel[]
  segments: SegmentModel[]
  task: TaskModel
  trigger: ReactElement
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
      trigger={trigger}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`edit-task-${task.id}-${resetKey}`}
      title="Edit task"
      description="Update this scheduled task."
      submitLabel="Save task"
      defaultValues={toTaskFormModel(task)}
      resources={resources}
      segments={segments}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Task updated',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to update task',
          )
          throw error
        }
      }}
    />
  )
}
