import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Package, Printer, RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { OrderDetailPage } from "~/src/components/custom/pages/admin/orders/detail/order-detail-page";

export const Route = createFileRoute("/{-$locale}/admin/orders/$orderId")({
  component: AdminOrderDetailRoute
});

function AdminOrderDetailRoute(): JSX.Element {
  const { orderId } = Route.useParams();
  const t = useTranslations("admin");

  const breadcrumbs = useMemo(
    () => [
      { href: CONSTANTS.ROUTES.ADMIN, label: t("nav.dashboard") },
      { href: CONSTANTS.ROUTES.ADMIN_ORDERS, label: t("nav.orders") }
    ],
    [t]
  );

  return (
    <>
      <AdminHeader
        backHref={CONSTANTS.ROUTES.ADMIN_ORDERS}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Printer className="size-3.5" strokeWidth={1.5} />
              {t("orderDetail.actions.print")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <RefreshCw className="size-3.5" strokeWidth={1.5} />
              {t("orderDetail.actions.refund")}
            </Button>
            <Button size="sm" className="h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90">
              <Package className="size-3.5" strokeWidth={1.5} />
              {t("orderDetail.actions.fulfill")}
            </Button>
          </>
        }
        title={`#${orderId}`}
      />
      <OrderDetailPage />
    </>
  );
}
