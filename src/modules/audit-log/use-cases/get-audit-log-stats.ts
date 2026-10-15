import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminAuditLogStats as auditLogGetAdminAuditLogStats } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

export const getAuditLogStats = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof auditLogZodSchemas.adminAuditLogStatsInput>) =>
    auditLogZodSchemas.adminAuditLogStatsInput.parse(input),
  )
  .handler(({ data }) => auditLogGetAdminAuditLogStats(data.today))

export const getAuditLogStatsQuery = (today: string) =>
  queryOptions({
    queryFn: () => getAuditLogStats({ data: { today } }),
    queryKey: [...AUDIT_LOG_QUERY_KEYS.ADMIN.STATS, today],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: AUDIT_LOG_QUERY_STALE_MS,
  })
