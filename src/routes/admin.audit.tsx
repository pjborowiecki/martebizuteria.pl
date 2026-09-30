import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { getAuditLogStatsQuery } from "~/src/modules/audit-log/use-cases/get-audit-log-stats"
import { listAuditLogsQuery } from "~/src/modules/audit-log/use-cases/list-audit-logs"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AuditLog } from "~/src/presentation/components/custom/pages/admin/audit/audit-log"

const prefetchAuditQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAuditLogStatsQuery(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...listAuditLogsQuery({
        page: 1,
        pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE,
      }),
      staleTime: "static",
    }),
  ])
}

const AuditPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <>
      <AdminHeader description={t("audit.description")} title={t("audit.title")} />
      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <AuditLog />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
  loader: ({ context }) => prefetchAuditQueries(context),
  shouldReload: false,
  staleTime: AUDIT_LOG_QUERY_STALE_MS,
})
