import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CatalogTabs } from "~/src/components/custom/pages/admin/catalog/catalog-tabs";
import { CollectionsStats } from "~/src/components/custom/pages/admin/catalog/collections/collections-stats";
import { CollectionsTable } from "~/src/components/custom/pages/admin/catalog/collections/collections-table";

import { COLLECTIONS } from "~/src/data/collections-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/collections/")({
  component: AdminCatalogCollectionsRoute
});

function AdminCatalogCollectionsRoute(): JSX.Element {
  const t = useTranslations("admin");

  const newParams = useMemo(() => ({ handle: "new" }), []);
  const addCollectionLink = useMemo(() => <LocalizedLink to={CONSTANTS.ROUTES.ADMIN_COLLECTION} params={newParams} />, [newParams]);

  const headerActions = useMemo(
    () => (
      <Button size="sm" className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90" render={addCollectionLink}>
        <Plus className="size-4" strokeWidth={1.5} />
        {t("collections.actions.addCollection")}
      </Button>
    ),
    [t, addCollectionLink]
  );

  const tabs = useMemo(() => <CatalogTabs active="collections" />, []);

  return (
    <>
      <AdminHeader title={t("collections.title")} description={t("collections.description")} actions={headerActions} tabs={tabs} />

      <div className="flex-1 space-y-5 p-8">
        <CollectionsStats />
        <CollectionsTable collections={COLLECTIONS} />
      </div>
    </>
  );
}
