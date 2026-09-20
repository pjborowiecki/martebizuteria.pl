import { createFileRoute } from "@tanstack/react-router"

import { handleAuthRequestWithAudit } from "~/src/integrations/better-auth/auth.utils"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequestWithAudit(request),
      POST: ({ request }) => handleAuthRequestWithAudit(request),
    },
  },
})
