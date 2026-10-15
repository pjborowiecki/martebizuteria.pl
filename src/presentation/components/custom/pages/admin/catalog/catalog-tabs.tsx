import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { AdminHeaderTabLink, AdminHeaderTabs } from "~/src/presentation/components/custom/pages/admin/admin-header-tabs"

import { ROUTES } from "~/src/routes"

export const CatalogTabs = ({ active }: CatalogTabsProps): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <AdminHeaderTabs>
      <AdminHeaderTabLink href={ROUTES.ADMIN_CATALOG} label={t("nav.products")} isActive={active === "products"} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_CATEGORIES} label={t("nav.categories")} isActive={active === "categories"} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_COLLECTIONS} label={t("nav.collections")} isActive={active === "collections"} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_ATTRIBUTES} label={t("nav.attributes")} isActive={active === "attributes"} />
    </AdminHeaderTabs>
  )
}

interface CatalogTabsProps {
  readonly active: "products" | "categories" | "collections" | "attributes"
}
