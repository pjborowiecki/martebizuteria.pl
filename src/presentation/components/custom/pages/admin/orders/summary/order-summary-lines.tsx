import { type JSX } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { type Order } from "~/src/modules/order/order.types"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { TotalsRow } from "~/src/presentation/components/custom/pages/account/orders/order-totals-row"

export const OrderSummaryLines = ({ order }: Readonly<OrderSummaryLinesProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()

  return (
    <section className="space-y-6">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead className={`pl-0 ${HEADER_CLASS}`}>{t("orderDetail.items.columns.product")}</TableHead>
            <TableHead className={`text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.qty")}</TableHead>
            <TableHead className={`text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.price")}</TableHead>
            <TableHead className={`pr-0 text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="pl-0 whitespace-normal">
                <p className="font-medium">{item.title}</p>
                {item.variantTitle !== undefined && <p className="text-muted-foreground">{item.variantTitle}</p>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPrice(item.unitPriceMinorUnits, order.currencyCode, locale)}</TableCell>
              <TableCell className="pr-0 text-right tabular-nums">
                {formatPrice(item.totalMinorUnits, order.currencyCode, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="ml-auto max-w-xs space-y-2">
        <TotalsRow label={t("orderDetail.summary.subtotal")} value={formatPrice(order.subtotalMinorUnits, order.currencyCode, locale)} />
        {order.discountTotalMinorUnits > 0 && (
          <TotalsRow
            label={t("orderDetail.summary.discount")}
            value={`−${formatPrice(order.discountTotalMinorUnits, order.currencyCode, locale)}`}
          />
        )}
        <TotalsRow
          label={
            order.delivery === undefined
              ? t("orderDetail.summary.shipping")
              : `${t("orderDetail.summary.shipping")} (${order.delivery.methodName})`
          }
          value={formatPrice(order.shippingTotalMinorUnits, order.currencyCode, locale)}
        />
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>{t("orderDetail.summary.total")}</span>
          <span className="tabular-nums">{formatPrice(order.totalMinorUnits, order.currencyCode, locale)}</span>
        </div>
        <TotalsRow
          label={t("orderSummary.vatIncluded", { rate: formatVatRatePercent(order.taxBasisPoints) })}
          value={formatPrice(order.taxTotalMinorUnits, order.currencyCode, locale)}
        />
      </div>
    </section>
  )
}

const HEADER_CLASS = "text-[11px] font-medium tracking-wider text-muted-foreground uppercase"

interface OrderSummaryLinesProps {
  readonly order: Order["adminOrderDetail"]
}
