import { type JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { TotalsRow } from "~/src/presentation/components/custom/pages/account/orders/order-totals-row"
import { useOrderMoney } from "~/src/presentation/components/custom/pages/account/orders/use-order-money"

const NO_AMOUNT = 0

export const OrderTotals = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()
  const money = useOrderMoney(order.currencyCode)

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <TotalsRow label={t("subtotal")} value={money(order.subtotalMinorUnits)} />
      {order.discountMinorUnits > NO_AMOUNT && <TotalsRow label={t("discount")} value={`−${money(order.discountMinorUnits)}`} />}
      <TotalsRow
        label={order.deliveryMethodName ?? t("shipping")}
        value={order.shippingMinorUnits === NO_AMOUNT ? t("free") : money(order.shippingMinorUnits)}
      />
      <Separator className="my-2" />
      <div className="flex justify-between text-[14px]">
        <span>{t("total")}</span>
        <span className="tabular-nums">{money(order.totalMinorUnits)}</span>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">
        {t("vatIncluded", { rate: formatVatRatePercent(order.taxBasisPoints) })} {money(order.taxMinorUnits)}
      </p>
      {order.refund === undefined ? undefined : (
        <div className="flex justify-between border-t border-border pt-3 text-[13px]">
          <span className="text-muted-foreground">
            {order.refund.refundedAt === undefined
              ? t("refunded")
              : t("refundedOn", { date: format.dateTime(order.refund.refundedAt, { dateStyle: "medium" }) })}
          </span>
          <span className="tabular-nums">−{money(order.refund.amountMinorUnits)}</span>
        </div>
      )}
    </div>
  )
}
