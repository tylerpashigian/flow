import type { ReactElement } from 'react'
import type { SegmentFormModel } from '#/data/planner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SegmentForm } from '../forms/segment-form'

export function SegmentDialog({
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
  defaultValues: SegmentFormModel
  description: string
  formKey: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: SegmentFormModel) => Promise<void>
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

        <SegmentForm
          key={formKey}
          defaultValues={defaultValues}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
