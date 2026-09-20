import { createServerOnlyFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { auth } from "~/src/integrations/better-auth/auth.server"

// Concurrent loaders share one lookup. A new request always revalidates the session.
const requestSessions = new WeakMap<Request, ReturnType<typeof auth.api.getSession>>()

export const getRequestSession = createServerOnlyFn((request: Request = getRequest()) => {
  const cached = requestSessions.get(request)
  if (cached) {
    return cached
  }

  const session = auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } })
  requestSessions.set(request, session)
  return session
})
