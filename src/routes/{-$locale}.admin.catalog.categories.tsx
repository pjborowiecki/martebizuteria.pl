import { type JSX, useMemo } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";

/** Static categories chrome (header + tabs). Child index route owns data loading. */
export const Route = createFileRoute("/{-$locale}/admin/catalog/categories")({
  component: CategoriesSectionLayoutRoute
});

function CategoriesSectionLayoutRoute(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const tabs = useMemo(() => <CatalogTabs active="categories" />, []);

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} tabs={tabs} />

      <div className={ADMIN_PAGE_BODY_CLASS}>
        <Outlet />
      </div>
    </>
  );
}
