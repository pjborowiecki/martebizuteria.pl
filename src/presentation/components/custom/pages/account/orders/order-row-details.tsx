import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { OrderRowItem } from "~/src/presentation/components/custom/pages/account/orders/order-row-item"

import { ROUTES } from "~/src/routes"

export const OrderRowDetails = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderSummary"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const orderParams = useMemo(
    () => ({
      id: order.id,
    }),
    [order.id],
  )

  return (
    <div className="pb-6 pl-0 sm:pl-19">
      <div className="divide-y divide-border/50">
        {order.items.map((item) => (
          <OrderRowItem currencyCode={order.currencyCode} item={item} key={item.id} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <LocalizedLink
          className="text-[11px] tracking-[0.15em] text-foreground uppercase transition-colors hover:text-muted-foreground"
          params={orderParams}
          to={ROUTES.ACCOUNT_ORDER}
        >
          {t("viewDetails")}
        </LocalizedLink>
      </div>
    </div>
  )
}
