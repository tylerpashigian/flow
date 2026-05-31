import type { ReactElement } from 'react'
import type { ResourceModel, SegmentModel, TaskFormModel } from '#/data/planner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TaskForm } from '../forms/task-form'

export function TaskDialog({
  defaultValues,
  description,
  formKey,
  onOpenChange,
  onSubmit,
  open,
  resources,
  segments,
  submitLabel,
  title,
  trigger,
}: {
  defaultValues: TaskFormModel
  description: string
  formKey: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: TaskFormModel) => Promise<void>
  open: boolean
  resources: ResourceModel[]
  segments: SegmentModel[]
  submitLabel: string
  title: string
  trigger: ReactElement
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <TaskForm
          key={formKey}
          defaultValues={defaultValues}
          resources={resources}
          segments={segments}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
