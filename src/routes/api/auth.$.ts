import { createFileRoute } from "@tanstack/react-router"

import { handleAuthRequestWithAudit } from "~/src/modules/audit-log/audit-log.auth.server"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequestWithAudit(request),
      POST: ({ request }) => handleAuthRequestWithAudit(request),
    },
  },
})
