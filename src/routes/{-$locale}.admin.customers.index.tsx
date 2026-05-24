import { type JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Download, Mail } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CustomerListTable } from "~/src/components/custom/pages/admin/customers/customers-index/customer-list-table";
import { CustomerStats } from "~/src/components/custom/pages/admin/customers/customers-index/customer-stats";

export const Route = createFileRoute("/{-$locale}/admin/customers/")({
  component: AdminCustomersRoute
});

function AdminCustomersRoute(): JSX.Element {
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
              {t("customers.actions.export")}
            </Button>
            <Button className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90" size="sm">
              <Mail className="size-4" strokeWidth={1.5} />
              {t("customers.actions.sendEmail")}
            </Button>
          </>
        }
        description={t("customers.description")}
        title={t("customers.title")}
      />
      <div className="flex h-[calc(100vh-64px)] flex-col p-8">
        <CustomerStats />
        <CustomerListTable />
      </div>
    </>
  );
}
