import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import { Image } from "~/src/presentation/components/custom/image"
import { ItemTitle } from "~/src/presentation/components/custom/pages/account/orders/order-item-title"
import { useOrderMoney } from "~/src/presentation/components/custom/pages/account/orders/use-order-money"

export const OrderItem = ({
  currencyCode,
  item,
}: Readonly<{
  currencyCode: string
  item: CustomerAccount["orderItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const money = useOrderMoney(currencyCode)

  return (
    <div className="flex items-center gap-5 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden bg-muted">
        <Image
          alt={item.name}
          className="absolute inset-0 size-full object-cover"
          height={80}
          src={item.image ?? PLACEHOLDER_IMAGE}
          width={80}
        />
      </div>
      <div className="min-w-0 flex-1">
        <ItemTitle handle={item.handle} name={item.name} />
        {item.variantTitle === undefined || item.variantTitle === "" ? undefined : (
          <p className="mt-1 text-[12px] text-muted-foreground">{item.variantTitle}</p>
        )}
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("qtyAtPrice", { price: money(item.unitPriceMinorUnits), qty: item.qty })}
        </p>
      </div>
      <p className="text-[14px] tabular-nums">{money(item.lineTotalMinorUnits)}</p>
    </div>
  )
}
