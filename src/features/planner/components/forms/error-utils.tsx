function normalizeMessages(
  errors: Array<string | { message?: string } | undefined>,
) {
  return [
    ...new Set(
      errors.flatMap((error) => {
        if (!error) {
          return []
        }

        if (typeof error === 'string') {
          return [error]
        }

        return error.message ? [error.message] : []
      }),
    ),
  ]
}

export function renderFieldErrors({
  errorMap,
  errors,
  isDirty,
}: {
  errorMap?: {
    onBlur?: string | { message?: string }
    onChange?: string | { message?: string }
    onSubmit?: string | { message?: string }
    onMount?: string | { message?: string }
  }
  errors: Array<string | { message?: string } | undefined>
  isDirty: boolean
}) {
  const prioritizedErrors = isDirty
    ? [errorMap?.onChange]
    : [
        errorMap?.onChange,
        errorMap?.onBlur,
        errorMap?.onSubmit,
        errorMap?.onMount,
      ]

  const messages = normalizeMessages(
    prioritizedErrors.some((error) => error !== undefined)
      ? prioritizedErrors
      : errors,
  )

  if (messages.length === 0) {
    return null
  }

  if (messages.length === 1) {
    return (
      <div role="alert" className="text-sm font-normal text-destructive">
        {messages[0]}
      </div>
    )
  }

  return (
    <div role="alert" className="text-sm font-normal text-destructive">
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
