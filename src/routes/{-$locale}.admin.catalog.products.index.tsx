import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CatalogStats } from "~/src/components/custom/pages/admin/catalog/catalog-stats/catalog-stats";
import { CatalogTable } from "~/src/components/custom/pages/admin/catalog/catalog-table/catalog-table";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";

import { PRODUCT_STATS, PRODUCTS } from "~/src/data/catalog-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/products/")({
  component: AdminCatalogIndexRoute
});

function AdminCatalogIndexRoute(): JSX.Element {
  const t = useTranslations("admin");

  const newParams = useMemo(() => ({ handle: "new" }), []);
  const addProductLink = useMemo(() => <LocalizedLink to={CONSTANTS.ROUTES.ADMIN_PRODUCT} params={newParams} />, [newParams]);

  const catalogActions = useMemo(
    () => (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-sidebar-border bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Download className="size-4" strokeWidth={1.5} />
          {t("catalog.actions.export")}
        </Button>
        <Button size="sm" className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90" render={addProductLink}>
          <Plus className="size-4" strokeWidth={1.5} />
          {t("catalog.actions.addProduct")}
        </Button>
      </>
    ),
    [t, addProductLink]
  );

  const tabs = useMemo(() => <CatalogTabs active="products" />, []);

  return (
    <>
      <AdminHeader title={t("catalog.productsTitle")} description={t("catalog.productsDescription")} actions={catalogActions} tabs={tabs} />

      <div className="flex-1 space-y-5 p-8">
        <CatalogStats stats={PRODUCT_STATS} />
        <CatalogTable products={PRODUCTS} />
      </div>
    </>
  );
}
