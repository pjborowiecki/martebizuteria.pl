import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { publishRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"

import { deleteAuditLogs as auditLogDeleteAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_MUTATION_KEYS, AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

export const deleteAuditLogs = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof auditLogZodSchemas.deleteAuditLogsInput>) => auditLogZodSchemas.deleteAuditLogsInput.parse(input))
  .handler(async ({ data: ids }) => {
    const deleted = await auditLogDeleteAuditLogs(ids)

    await publishRealtimeInvalidation({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })

    return { deleted, ok: true as const }
  })

export const deleteAuditLogsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteAuditLogs>[0]["data"]) => deleteAuditLogs({ data }),
  mutationKey: AUDIT_LOG_MUTATION_KEYS.DELETE,
})
