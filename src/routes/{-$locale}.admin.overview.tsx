import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { adminDashboardSnapshotQueryOptions } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { DashboardOverviewContent } from "~/src/presentation/components/custom/pages/admin/dashboard-overview-content"
const AdminOverviewPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <>
      <AdminHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <DashboardOverviewContent />
      </div>
    </>
  )
}
export const Route = createFileRoute("/{-$locale}/admin/overview")({
  component: AdminOverviewPage,
  loader: ({ context }) =>
    context.queryClient.query({
      ...adminDashboardSnapshotQueryOptions({
        locale: context.locale,
      }),
      staleTime: "static",
    }),
  shouldReload: false,
  staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
})
