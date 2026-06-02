import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { cn } from "~/src/lib/utils";

import { LocalizedLink, type LocalizedTo } from "~/src/components/custom/localized-link";
import { ADMIN_LAYOUT_BG_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";

interface CatalogTabsProps {
  readonly active: "products" | "categories" | "collections";
}

export function CatalogTabs({ active }: CatalogTabsProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div
      className={cn(
        "scrollbar-hide flex h-12 w-full items-center gap-6 overflow-x-auto border-b border-border/40 px-6",
        ADMIN_LAYOUT_BG_CLASS
      )}
    >
      <TabLink href={CONSTANTS.ROUTES.ADMIN_CATALOG} label={t("nav.products")} isActive={active === "products"} />
      <TabLink href={CONSTANTS.ROUTES.ADMIN_CATEGORIES} label={t("nav.categories")} isActive={active === "categories"} />
      <TabLink href={CONSTANTS.ROUTES.ADMIN_COLLECTIONS} label={t("nav.collections")} isActive={active === "collections"} />
    </div>
  );
}

function TabLink({
  href,
  label,
  isActive
}: {
  readonly href: LocalizedTo;
  readonly label: string;
  readonly isActive: boolean;
}): JSX.Element {
  return (
    <LocalizedLink
      to={href}
      className={cn(
        "relative flex h-full items-center text-[13px] whitespace-nowrap transition-colors",
        isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {isActive && <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-t-full bg-foreground" />}
    </LocalizedLink>
  );
}
