import { useState } from 'react'
import { toast } from 'sonner'
import { createDefaultSegmentFormModel } from '#/data/planner'
import type { SegmentFormModel } from '#/data/planner'
import { Button } from '@/components/ui/button'
import { SegmentDialog } from './segment-dialog'

export function CreateSegmentDialog({
  onSubmit,
}: {
  onSubmit: (value: SegmentFormModel) => Promise<string | void>
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
      trigger={<Button variant="outline">Create segment</Button>}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`create-segment-${resetKey}`}
      title="Create segment"
      description="Add a new grouping label to the current plan."
      submitLabel="Create segment"
      defaultValues={createDefaultSegmentFormModel()}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Segment created',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to create segment',
          )
          throw error
        }
      }}
    />
  )
}
