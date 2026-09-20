import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { deleteAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

import { publishRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server"

const deleteAuditLogsInput = z.array(z.string().min(1))

export const deleteAuditLogsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteAuditLogsInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin()

    const deleted = await deleteAuditLogs(ids)

    await publishRealtimeInvalidation({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })

    return { deleted, ok: true as const }
  })
