import { type JSX, useMemo } from "react"

import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { ROUTES } from "~/src/routes"

const FIRST_PAGE = 1

export const OrdersFilterLink = ({
  currentFilter,
  option,
}: Readonly<{
  currentFilter: CustomerAccountOrderFilter
  option: CustomerAccountOrderFilter
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const isActive = currentFilter === option
  const search = useMemo(() => ({ filter: option, page: FIRST_PAGE }), [option])

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "account-ghost" }),
        "tracking-[0.18em]",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      search={search}
      to={ROUTES.ACCOUNT_ORDERS}
    >
      {t(`filter.${option}`)}
    </Link>
  )
}
