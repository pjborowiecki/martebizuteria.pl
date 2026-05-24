import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";
import { CategoriesStats } from "~/src/components/custom/pages/admin/catalog/categories/categories-stats";
import { CategoriesTable } from "~/src/components/custom/pages/admin/catalog/categories/categories-table";

import { CATEGORIES, CATEGORY_STATS } from "~/src/data/categories-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/categories/")({
  component: AdminCatalogCategoriesRoute
});

function AdminCatalogCategoriesRoute(): JSX.Element {
  const t = useTranslations("admin");

  const newParams = useMemo(() => ({ handle: "new" }), []);
  const addCategoryLink = useMemo(() => <LocalizedLink to={CONSTANTS.ROUTES.ADMIN_CATEGORY} params={newParams} />, [newParams]);

  const headerActions = useMemo(
    () => (
      <Button size="sm" className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90" render={addCategoryLink}>
        <Plus className="size-4" strokeWidth={1.5} />
        {t("categories.actions.addCategory")}
      </Button>
    ),
    [t, addCategoryLink]
  );

  const tabs = useMemo(() => <CatalogTabs active="categories" />, []);

  return (
    <>
      <AdminHeader title={t("categories.title")} description={t("categories.description")} actions={headerActions} tabs={tabs} />

      <div className="flex-1 space-y-5 p-8">
        <CategoriesStats stats={CATEGORY_STATS} />
        <CategoriesTable categories={CATEGORIES} />
      </div>
    </>
  );
}
