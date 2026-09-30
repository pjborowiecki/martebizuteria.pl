import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminAuditLogStats as auditLogGetAdminAuditLogStats } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { resolveStartOfToday } from "~/src/modules/audit-log/audit-log.utils"

export const getAuditLogStats = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .handler(() => auditLogGetAdminAuditLogStats(resolveStartOfToday()))

export const getAuditLogStatsQuery = () =>
  queryOptions({
    queryFn: () => getAuditLogStats(),
    queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: AUDIT_LOG_QUERY_STALE_MS,
  })
