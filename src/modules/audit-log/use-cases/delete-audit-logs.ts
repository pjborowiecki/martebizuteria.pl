import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleAdminAuditLogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { deleteAuditLogs as auditLogDeleteAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_MUTATION_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"
import { recordAuditLogsDeletedAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"

export const deleteAuditLogs = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof auditLogZodSchemas.deleteAuditLogsInput>) => auditLogZodSchemas.deleteAuditLogsInput.parse(input))
  .handler(async ({ data: ids }) => {
    const deletedIds = await auditLogDeleteAuditLogs(ids)

    if (deletedIds.length > 0) {
      recordAuditLogsDeletedAudit(String(deletedIds.length), { metadata: { ids: deletedIds } })
    }

    scheduleAdminAuditLogInvalidation()

    return { deleted: deletedIds.length, ok: true as const }
  })

export const deleteAuditLogsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteAuditLogs>[0]["data"]) => deleteAuditLogs({ data }),
  mutationKey: AUDIT_LOG_MUTATION_KEYS.DELETE,
})
