import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminAuditLogStats as auditLogGetAdminAuditLogStats } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { resolveStartOfToday } from "~/src/modules/audit-log/audit-log.utils"

export const fetchAdminAuditLogStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  return auditLogGetAdminAuditLogStats(resolveStartOfToday())
})

export const adminAuditLogStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminAuditLogStatsFn(),
    queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: AUDIT_LOG_QUERY_STALE_MS,
  })
