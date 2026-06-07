import type { JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { DashboardOverviewContent } from "~/src/components/custom/pages/admin/dashboard-overview-content";

import { ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants";
import { adminDashboardQueryOptions } from "~/src/modules/admin-dashboard/admin-dashboard.queries";

async function prefetchAdminDashboardSnapshot(context: { locale: string; queryClient: QueryClient }): Promise<void> {
  await context.queryClient.ensureQueryData(adminDashboardQueryOptions.adminDashboardSnapshotQueryOptions({ locale: context.locale }));
}

export const Route = createFileRoute("/{-$locale}/admin/overview")({
  component: AdminOverviewPage,
  loader: ({ context, params }) =>
    prefetchAdminDashboardSnapshot({
      locale: params.locale ?? DEFAULT_LOCALE,
      queryClient: context.queryClient
    }),
  shouldReload: false,
  staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS
});

function AdminOverviewPage(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <>
      <AdminHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <DashboardOverviewContent />
      </div>
    </>
  );
}
