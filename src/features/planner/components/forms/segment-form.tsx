import { useForm } from '@tanstack/react-form'
import type { SegmentFormModel } from '#/data/planner'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { renderFieldErrors } from './error-utils'

export function SegmentForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues: SegmentFormModel
  submitLabel: string
  onSubmit: (value: SegmentFormModel) => Promise<void>
}) {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
      className="grid gap-4"
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.trim().length === 0 ? 'Segment name is required' : undefined,
          onBlur: ({ value }) =>
            value.trim().length === 0 ? 'Segment name is required' : undefined,
        }}
        listeners={{
          onChange: ({ fieldApi }) => {
            if (fieldApi.state.meta.errors.length > 0) {
              fieldApi.validate('blur')
            }
          },
        }}
      >
        {(field) => (
          <Field
            data-invalid={
              field.state.meta.isTouched && !field.state.meta.isValid
            }
          >
            <FieldLabel htmlFor={field.name}>Name</FieldLabel>
            <FieldContent>
              <Input
                id={field.name}
                value={field.state.value}
                placeholder="Sprint 15"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
              />
              {field.state.meta.isTouched
                ? renderFieldErrors({
                    errorMap: field.state.meta.errorMap,
                    errors: field.state.meta.errors,
                    isDirty: field.state.meta.isDirty,
                  })
                : null}
            </FieldContent>
          </Field>
        )}
      </form.Field>

      <DialogFooter showCloseButton>
        <form.Subscribe
          selector={(state) =>
            [
              state.canSubmit,
              state.isSubmitting,
              state.isTouched,
              state.isDirty,
            ] as const
          }
        >
          {([canSubmit, isSubmitting, isTouched, isDirty]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || !isTouched || !isDirty}
            >
              {isSubmitting ? `${submitLabel}...` : submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
