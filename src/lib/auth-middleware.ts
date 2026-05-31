import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { authClient } from '#/lib/auth-client'

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: getRequest().headers,
    },
  })

  return await next({
    context: {
      user: { id: session?.user.id },
    },
  })
})
