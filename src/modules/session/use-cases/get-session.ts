import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

export const getSessionFn = createServerFn({ method: "GET" }).handler(() => getRequestSession())
