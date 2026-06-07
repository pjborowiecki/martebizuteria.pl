import { type JSX, Suspense } from "react";

import { DashboardCharts } from "~/src/components/custom/pages/admin/dashboard-charts";
import { DashboardOverviewFallback } from "~/src/components/custom/pages/admin/dashboard-overview-fallback";
import { DashboardRecentOrders } from "~/src/components/custom/pages/admin/dashboard-recent-orders";
import { DashboardStats } from "~/src/components/custom/pages/admin/dashboard-stats";
import { DashboardTopProducts } from "~/src/components/custom/pages/admin/dashboard-top-products";

const dashboardOverviewFallback = <DashboardOverviewFallback />;

export function DashboardOverviewContent(): JSX.Element {
  return (
    <Suspense fallback={dashboardOverviewFallback}>
      <div className="space-y-6">
        <DashboardStats />
        <DashboardCharts />
        <div className="grid gap-5 xl:grid-cols-4">
          <DashboardRecentOrders />
          <DashboardTopProducts />
        </div>
      </div>
    </Suspense>
  );
}
