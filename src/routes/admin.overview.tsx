import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { getDashboardSnapshotQuery } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot"
import { getAdminSalesStatusQuery } from "~/src/modules/store-setting/use-cases/get-sales-status"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { DashboardOverviewContent } from "~/src/presentation/components/custom/pages/admin/dashboard-overview-content"
import { DashboardSalesSwitch } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-sales-switch"

const AdminOverviewPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <>
      <AdminHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-8">
        <DashboardSalesSwitch />
        <DashboardOverviewContent />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/overview")({
  component: AdminOverviewPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...getDashboardSnapshotQuery({
          locale: context.locale,
        }),
        staleTime: "static",
      }),
      context.queryClient.query(getAdminSalesStatusQuery()),
    ]),
  shouldReload: false,
  staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
})
