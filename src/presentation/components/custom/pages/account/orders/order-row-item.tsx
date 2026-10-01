import { type JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import { Image } from "~/src/presentation/components/custom/image"

export const OrderRowItem = ({
  currencyCode,
  item,
}: Readonly<{
  currencyCode: string
  item: CustomerAccount["orderItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const format = useFormatter()
  const money = (minorUnits: number) =>
    format.number(centsToDisplayAmount(minorUnits), {
      currency: currencyCode,
      style: "currency",
    })

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden bg-muted">
        <Image
          alt={item.name}
          className="absolute inset-0 size-full object-cover"
          height={48}
          src={item.image ?? PLACEHOLDER_IMAGE}
          width={48}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{item.name}</p>
        {item.variantTitle !== undefined && item.variantTitle !== "" && (
          <p className="text-[11px] text-muted-foreground">{item.variantTitle}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{t("qtyAtPrice", { price: money(item.unitPriceMinorUnits), qty: item.qty })}</p>
      </div>
      <p className="text-[13px] tabular-nums">{money(item.lineTotalMinorUnits)}</p>
    </div>
  )
}
