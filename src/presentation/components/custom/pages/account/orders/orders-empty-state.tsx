import { type JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const ALL_ORDERS_SEARCH = { filter: "all", page: 1 } as const

export const OrdersEmptyState = ({ filter }: Readonly<{ filter: CustomerAccountOrderFilter }>): JSX.Element => {
  const t = useTranslations("pages.account.orders")

  if (filter === "all") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("emptyAll")}</p>
        <LocalizedLink
          className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
          to={ROUTES.PRODUCTS}
        >
          {t("browseProducts")}
        </LocalizedLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm text-muted-foreground">{t("emptyFiltered", { filter: t(`filter.${filter}`) })}</p>
      <Link
        className="text-[11px] tracking-[0.15em] text-foreground uppercase underline underline-offset-4"
        search={ALL_ORDERS_SEARCH}
        to={ROUTES.ACCOUNT_ORDERS}
      >
        {t("showAll")}
      </Link>
    </div>
  )
}
