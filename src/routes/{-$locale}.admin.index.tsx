import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { DashboardCharts } from "~/src/components/custom/pages/admin/dashboard-charts";
import { DashboardRecentOrders } from "~/src/components/custom/pages/admin/dashboard-recent-orders";
import { DashboardStats } from "~/src/components/custom/pages/admin/dashboard-stats";
import { DashboardTopProducts } from "~/src/components/custom/pages/admin/dashboard-top-products";

export const Route = createFileRoute("/{-$locale}/admin/")({
  component: AdminDashboardPage
});

function AdminDashboardPage(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <>
      <AdminHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      <div className="flex-1 space-y-6 p-8">
        <DashboardStats />
        <DashboardCharts />
        <div className="grid gap-5 xl:grid-cols-4">
          <DashboardRecentOrders />
          <DashboardTopProducts />
        </div>
      </div>
    </>
  );
}
