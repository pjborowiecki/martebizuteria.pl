import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { type LocalizedTo } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CustomerCharts } from "~/src/components/custom/pages/admin/customers/customer-detail/customer-charts";
import { CustomerKpis } from "~/src/components/custom/pages/admin/customers/customer-detail/customer-kpis";
import { CustomerOrders } from "~/src/components/custom/pages/admin/customers/customer-detail/customer-orders";
import { CustomerSidebar } from "~/src/components/custom/pages/admin/customers/customer-detail/customer-sidebar";

import { CUSTOMER } from "~/src/data/customer-detail-data";

export const Route = createFileRoute("/{-$locale}/admin/customers/$id")({
  component: AdminCustomerDetailRoute
});

function AdminCustomerDetailRoute(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  const breadcrumbs = useMemo(
    () => [
      { href: CONSTANTS.ROUTES.ADMIN, label: t("breadcrumb.dashboard") } satisfies { href: LocalizedTo; label: string },
      { href: CONSTANTS.ROUTES.ADMIN_CUSTOMERS, label: t("breadcrumb.customers") } satisfies { href: LocalizedTo; label: string }
    ],
    [t]
  );

  const headerActions = useMemo(
    () => (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Mail className="size-3.5" strokeWidth={1.5} />
          {t("actions.sendEmail")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90">
          <Plus className="size-3.5" strokeWidth={1.5} />
          {t("actions.createOrder")}
        </Button>
      </>
    ),
    [t]
  );

  return (
    <>
      <AdminHeader backHref={CONSTANTS.ROUTES.ADMIN_CUSTOMERS} title={CUSTOMER.id} breadcrumbs={breadcrumbs} actions={headerActions} />

      <div className="flex-1 p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          {/* ── Main content ── */}
          <div className="space-y-8">
            <CustomerKpis />
            <CustomerCharts />
            <CustomerOrders />
          </div>

          {/* ── Sidebar ── */}
          <CustomerSidebar />
        </div>
      </div>
    </>
  );
}
