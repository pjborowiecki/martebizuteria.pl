import { type JSX, useMemo } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CatalogTabs } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-tabs"

const CategoriesSectionLayoutRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const tabs = useMemo(() => <CatalogTabs active="categories" />, [])
  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} tabs={tabs} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <Outlet />
      </div>
    </>
  )
}
export const Route = createFileRoute("/{-$locale}/admin/catalog/categories")({
  component: CategoriesSectionLayoutRoute,
  staticData: {
    namespaces: ["pages.admin.catalog.categories", "pages.admin.catalog.products", "pages.admin.catalog.products.catalogList"],
  },
})
