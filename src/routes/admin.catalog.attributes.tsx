import { type JSX, useMemo } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CatalogTabs } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-tabs"

const AttributesSectionLayoutRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const tabs = useMemo(() => <CatalogTabs active="attributes" />, [])

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} tabs={tabs} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <Outlet />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/catalog/attributes")({
  component: AttributesSectionLayoutRoute,
  staticData: {
    namespaces: ["pages.admin.catalog.attributes"],
  },
})
