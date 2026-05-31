import { useState } from 'react'
import { toast } from 'sonner'
import { toResourceFormModel } from '#/data/planner'
import type { ResourceFormModel, ResourceModel } from '#/data/planner'
import type { ReactElement } from 'react'
import { ResourceDialog } from './resource-dialog'

export function EditResourceDialog({
  onSubmit,
  resource,
  trigger,
}: {
  onSubmit: (value: ResourceFormModel) => Promise<string | void>
  resource: ResourceModel
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
    <ResourceDialog
      trigger={trigger}
      open={open}
      onOpenChange={handleOpenChange}
      formKey={`edit-resource-${resource.id}-${resetKey}`}
      title="Edit resource"
      description="Update this planner resource."
      submitLabel="Save resource"
      defaultValues={toResourceFormModel(resource)}
      onSubmit={async (value) => {
        try {
          const successMessage = await onSubmit(value)
          toast.success(
            typeof successMessage === 'string'
              ? successMessage
              : 'Resource updated',
          )
          handleOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to update resource',
          )
          throw error
        }
      }}
    />
  )
}
