import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"
import { formatSellerPostalAddress } from "~/src/modules/store-setting/store-setting.utils"
import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"
import { OrderSummaryDelivery } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-delivery"

export const OrderSummaryParties = ({ order }: Readonly<OrderSummaryPartiesProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()
  const { data: seller } = useSuspenseQuery(getAdminSellerDetailsQuery())

  return (
    <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
      <section className="space-y-2">
        <h2 className={HEADING_CLASS}>{t("orderSummary.seller")}</h2>
        <div className="space-y-1 text-[13px]">
          {formatSellerPostalAddress(seller, locale).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="tabular-nums">{t("orderDetail.billing.nip", { nip: seller.nip })}</p>
          <p>{seller.email}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={HEADING_CLASS}>{t("orderSummary.buyer")}</h2>
        {order.billingCompanyName !== undefined && <p className="text-[13px] font-medium">{order.billingCompanyName}</p>}
        {order.billingNip !== undefined && (
          <p className="text-[13px] tabular-nums">{t("orderDetail.billing.nip", { nip: order.billingNip })}</p>
        )}
        {order.billingAddress === undefined ? (
          <p className="text-[13px]">{order.customer.name}</p>
        ) : (
          <OrderAddressLines address={order.billingAddress} />
        )}
        <p className="text-[13px] text-muted-foreground">{order.customer.email}</p>
      </section>

      <OrderSummaryDelivery order={order} />
    </div>
  )
}

const HEADING_CLASS = "text-[11px] font-medium tracking-wider text-muted-foreground uppercase"

interface OrderSummaryPartiesProps {
  readonly order: Order["adminOrderDetail"]
}
