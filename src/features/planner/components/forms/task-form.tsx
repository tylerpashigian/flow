import { useForm } from '@tanstack/react-form'
import type { ResourceModel, SegmentModel, TaskFormModel } from '#/data/planner'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import * as ShadcnSelect from '@/components/ui/select'
import { renderFieldErrors } from './error-utils'

export function TaskForm({
  defaultValues,
  resources,
  segments,
  submitLabel,
  onSubmit,
}: {
  defaultValues: TaskFormModel
  resources: ResourceModel[]
  segments: SegmentModel[]
  submitLabel: string
  onSubmit: (value: TaskFormModel) => Promise<void>
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
        name="title"
        validators={{
          onChange: ({ value }) =>
            value.trim().length === 0 ? 'Task title is required' : undefined,
          onBlur: ({ value }) =>
            value.trim().length === 0 ? 'Task title is required' : undefined,
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
            <FieldLabel htmlFor={field.name}>Title</FieldLabel>
            <FieldContent>
              <Input
                id={field.name}
                value={field.state.value}
                placeholder="Define timeline data model"
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

      <div className="grid gap-2 sm:grid-cols-2">
        <form.Field
          name="startDate"
          validators={{
            onChange: ({ value }) =>
              value ? undefined : 'Task start date is required',
            onBlur: ({ value }) =>
              value ? undefined : 'Task start date is required',
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
              <FieldLabel>Start date</FieldLabel>
              <FieldContent>
                <DatePicker
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  buttonClassName="w-full"
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

        <form.Field
          name="durationDays"
          validators={{
            onChange: ({ value }) => {
              const durationDays = Number.parseInt(value, 10)
              return Number.isInteger(durationDays) && durationDays >= 1
                ? undefined
                : 'Task duration must be at least 1 day'
            },
            onBlur: ({ value }) => {
              const durationDays = Number.parseInt(value, 10)
              return Number.isInteger(durationDays) && durationDays >= 1
                ? undefined
                : 'Task duration must be at least 1 day'
            },
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
              <FieldLabel htmlFor={field.name}>Duration (days)</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="number"
                  min={1}
                  value={field.state.value}
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
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <form.Field name="segmentId">
          {(field) => {
            const selectedLabel = segments.find(
              (segment) => segment.id === field.state.value,
            )?.name

            return (
              <Field>
                <FieldLabel>Segment</FieldLabel>
                <FieldContent>
                  <ShadcnSelect.Select
                    name={field.name}
                    value={field.state.value ?? null}
                    onValueChange={(value) =>
                      field.handleChange(value ?? undefined)
                    }
                  >
                    <ShadcnSelect.SelectTrigger className="w-full">
                      <ShadcnSelect.SelectValue
                        placeholder="No segment"
                        className={
                          !selectedLabel ? 'text-muted-foreground' : undefined
                        }
                      >
                        {selectedLabel ?? 'No segment'}
                      </ShadcnSelect.SelectValue>
                    </ShadcnSelect.SelectTrigger>
                    <ShadcnSelect.SelectContent>
                      <ShadcnSelect.SelectGroup>
                        <ShadcnSelect.SelectLabel>
                          Segment
                        </ShadcnSelect.SelectLabel>
                        {segments.map((segment) => (
                          <ShadcnSelect.SelectItem
                            key={segment.id}
                            value={segment.id}
                          >
                            {segment.name}
                          </ShadcnSelect.SelectItem>
                        ))}
                      </ShadcnSelect.SelectGroup>
                    </ShadcnSelect.SelectContent>
                  </ShadcnSelect.Select>
                  {field.state.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-0"
                      onClick={() => field.handleChange(undefined)}
                    >
                      Clear segment
                    </Button>
                  ) : null}
                </FieldContent>
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="resourceId">
          {(field) => {
            const selectedLabel = resources.find(
              (resource) => resource.id === field.state.value,
            )?.name

            return (
              <Field>
                <FieldLabel>Assign resource</FieldLabel>
                <FieldContent>
                  <ShadcnSelect.Select
                    name={field.name}
                    value={field.state.value ?? null}
                    onValueChange={(value) =>
                      field.handleChange(value ?? undefined)
                    }
                  >
                    <ShadcnSelect.SelectTrigger className="w-full">
                      <ShadcnSelect.SelectValue
                        placeholder="Unassigned"
                        className={
                          !selectedLabel ? 'text-muted-foreground' : undefined
                        }
                      >
                        {selectedLabel ?? 'Unassigned'}
                      </ShadcnSelect.SelectValue>
                    </ShadcnSelect.SelectTrigger>
                    <ShadcnSelect.SelectContent>
                      <ShadcnSelect.SelectGroup>
                        <ShadcnSelect.SelectLabel>
                          Assign resource
                        </ShadcnSelect.SelectLabel>
                        {resources.map((resource) => (
                          <ShadcnSelect.SelectItem
                            key={resource.id}
                            value={resource.id}
                          >
                            {resource.name}
                          </ShadcnSelect.SelectItem>
                        ))}
                      </ShadcnSelect.SelectGroup>
                    </ShadcnSelect.SelectContent>
                  </ShadcnSelect.Select>
                  {field.state.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-0"
                      onClick={() => field.handleChange(undefined)}
                    >
                      Clear resource
                    </Button>
                  ) : null}
                </FieldContent>
              </Field>
            )
          }}
        </form.Field>
      </div>

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
