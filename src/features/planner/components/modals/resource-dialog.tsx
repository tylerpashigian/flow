import type { ReactElement } from 'react'
import type { ResourceFormModel } from '#/data/planner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ResourceForm } from '../forms/resource-form'

export function ResourceDialog({
  defaultValues,
  description,
  formKey,
  onOpenChange,
  onSubmit,
  open,
  submitLabel,
  title,
  trigger,
}: {
  defaultValues: ResourceFormModel
  description: string
  formKey: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: ResourceFormModel) => Promise<void>
  open: boolean
  submitLabel: string
  title: string
  trigger: ReactElement
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ResourceForm
          key={formKey}
          defaultValues={defaultValues}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
