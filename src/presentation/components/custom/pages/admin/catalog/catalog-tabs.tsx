import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { ADMIN_LAYOUT_BG_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

import { ROUTES } from "~/src/routes"

export const CatalogTabs = ({ active }: CatalogTabsProps): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div
      className={cn(
        "scrollbar-hide flex h-12 w-full items-center gap-6 overflow-x-auto border-b border-border/40 px-6",
        ADMIN_LAYOUT_BG_CLASS,
      )}
    >
      <TabLink href={ROUTES.ADMIN_CATALOG} label={t("nav.products")} isActive={active === "products"} />
      <TabLink href={ROUTES.ADMIN_CATEGORIES} label={t("nav.categories")} isActive={active === "categories"} />
      <TabLink href={ROUTES.ADMIN_COLLECTIONS} label={t("nav.collections")} isActive={active === "collections"} />
      <TabLink href={ROUTES.ADMIN_ATTRIBUTES} label={t("nav.attributes")} isActive={active === "attributes"} />
    </div>
  )
}

const TabLink = ({
  href,
  label,
  isActive,
}: {
  readonly href: LocalizedTo
  readonly label: string
  readonly isActive: boolean
}): JSX.Element => (
  <LocalizedLink
    to={href}
    className={cn(
      "relative flex h-full items-center text-[13px] whitespace-nowrap transition-colors",
      isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {label}
    {isActive && <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-t-full bg-foreground" />}
  </LocalizedLink>
)

interface CatalogTabsProps {
  readonly active: "products" | "categories" | "collections" | "attributes"
}
