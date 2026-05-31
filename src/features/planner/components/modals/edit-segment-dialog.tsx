import { useState } from 'react'
import { toast } from 'sonner'
import { toSegmentFormModel } from '#/data/planner'
import type { SegmentFormModel, SegmentModel } from '#/data/planner'
import type { ReactElement } from 'react'
import { SegmentDialog } from './segment-dialog'

export function EditSegmentDialog({
  onSubmit,
  segment,
  trigger,
}: {
  onSubmit: (value: SegmentFormModel) => Promise<string | void>
  segment: SegmentModel
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
    <SegmentDialog
      trigger={trigger}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`edit-segment-${segment.id}-${resetKey}`}
      title="Edit segment"
      description="Update this planner segment."
      submitLabel="Save segment"
      defaultValues={toSegmentFormModel(segment)}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Segment updated',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to update segment',
          )
          throw error
        }
      }}
    />
  )
}
