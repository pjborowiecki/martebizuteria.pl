import type { JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { AuditLog } from "~/src/components/custom/pages/admin/audit/audit-log";

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants";
import { auditLogQueryOptions } from "~/src/modules/audit-log/audit-log.queries";

async function prefetchAuditQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(auditLogQueryOptions.adminAuditLogStatsQueryOptions()),
    context.queryClient.ensureQueryData(
      auditLogQueryOptions.adminAuditLogsPageQueryOptions({
        page: 1,
        pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE
      })
    )
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/audit")({
  component: AuditPage,
  loader: ({ context }) => prefetchAuditQueries(context),
  shouldReload: false,
  staleTime: AUDIT_LOG_QUERY_STALE_MS
});

function AuditPage(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <>
      <AdminHeader description={t("audit.description")} title={t("audit.title")} />
      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <AuditLog />
      </div>
    </>
  );
}
