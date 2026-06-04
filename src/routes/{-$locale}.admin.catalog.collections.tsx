import { type JSX, useMemo } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";

/** Static collections chrome (header + tabs). Child index route owns data loading. */
export const Route = createFileRoute("/{-$locale}/admin/catalog/collections")({
  component: CollectionsSectionLayoutRoute
});

function CollectionsSectionLayoutRoute(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const tabs = useMemo(() => <CatalogTabs active="collections" />, []);

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} tabs={tabs} />

      <div className={ADMIN_PAGE_BODY_CLASS}>
        <Outlet />
      </div>
    </>
  );
}
