import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { OrdersPage } from "~/src/components/custom/pages/admin/orders/orders-page";

export const Route = createFileRoute("/{-$locale}/admin/orders/")({
  component: AdminOrdersRoute
});

function AdminOrdersRoute(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <>
      <AdminHeader
        actions={
          <>
            <Button
              className="h-9 gap-2 border-sidebar-border bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              size="sm"
              variant="outline"
            >
              <Download className="size-4" strokeWidth={1.5} />
              {t("orders.actions.export")}
            </Button>
            <Button className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90" size="sm">
              <Plus className="size-4" strokeWidth={1.5} />
              {t("orders.actions.newOrder")}
            </Button>
          </>
        }
        description={t("orders.description")}
        title={t("orders.title")}
      />
      <OrdersPage />
    </>
  );
}
