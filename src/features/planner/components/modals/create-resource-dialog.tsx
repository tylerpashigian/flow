import { useState } from 'react'
import { toast } from 'sonner'
import { createDefaultResourceFormModel } from '#/data/planner'
import type { ResourceFormModel } from '#/data/planner'
import { Button } from '@/components/ui/button'
import { ResourceDialog } from './resource-dialog'

export function CreateResourceDialog({
  onSubmit,
}: {
  onSubmit: (value: ResourceFormModel) => Promise<string | void>
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
    <ResourceDialog
      trigger={<Button variant="outline">Create resource</Button>}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`create-resource-${resetKey}`}
      title="Create resource"
      description="Add a new planner resource to the current plan."
      submitLabel="Create resource"
      defaultValues={createDefaultResourceFormModel()}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Resource created',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to create resource',
          )
          throw error
        }
      }}
    />
  )
}
