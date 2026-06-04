import { type JSX, useMemo } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";

export const Route = createFileRoute("/{-$locale}/admin/catalog/products")({
  component: ProductsSectionLayoutRoute
});

function ProductsSectionLayoutRoute(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const tabs = useMemo(() => <CatalogTabs active="products" />, []);

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} tabs={tabs} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <Outlet />
      </div>
    </>
  );
}
