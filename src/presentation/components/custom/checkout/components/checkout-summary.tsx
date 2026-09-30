import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { useWatch } from "react-hook-form"
import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { getCartLineUnitPriceCents } from "~/src/modules/cart/cart.pricing"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { getProductImageUrl } from "~/src/lib/image"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { Image } from "~/src/presentation/components/custom/image"

export const CheckoutSummary = (): JSX.Element => {
  const t = useTranslations("pages.checkout")
  const format = useFormatter()
  const { items, cartTotal, itemCount } = useCartStore()
  const { control } = useCheckoutForm()
  const deliveryMethodId = useWatch({
    control,
    name: "deliveryMethod",
  })

  const { data: deliveryMethods = [] } = useQuery(listDeliveryMethodsQuery())
  const selectedDeliveryMethod = deliveryMethods.find((m) => m.id === deliveryMethodId)
  const deliveryCostCents = selectedDeliveryMethod?.price ?? 0
  const subtotalCents = cartTotal()
  const totalCents = subtotalCents + deliveryCostCents
  const money = (cents: number) =>
    format.number(centsToDisplayAmount(cents), {
      currency: "PLN",
      style: "currency",
    })
  const deliveryLabel = (() => {
    if (selectedDeliveryMethod === undefined) {
      return t("checkoutSummary.deliveryCalculated")
    }

    return deliveryCostCents === 0 ? t("checkoutSummary.free") : money(deliveryCostCents)
  })()

  return (
    <aside className="sticky top-24 border border-border/50 bg-muted/40 p-6 text-card-foreground md:p-8">
      <div className="space-y-4 text-[12px]">
        <div className="flex justify-between gap-4">
          <span className="font-medium tracking-[0.18em] text-foreground/80 uppercase">
            {t("checkoutSummary.itemsCount", {
              count: itemCount(),
            })}
          </span>
          <span className="font-light tracking-wider text-foreground tabular-nums">{money(subtotalCents)}</span>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span className="font-medium tracking-[0.18em] uppercase">{t("checkoutSummary.delivery")}</span>
          <span className="font-light tracking-wider tabular-nums">{deliveryLabel}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t border-border/30 pt-6">
          <span className="text-[14px] font-medium tracking-[0.18em] text-foreground uppercase">{t("checkoutSummary.total")}</span>
          <span className="text-[14px] font-medium tracking-wider text-foreground tabular-nums">{money(totalCents)}</span>
        </div>
      </div>

      <div className="mt-8 space-y-6 border-t border-foreground/20 pt-8">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-5">
            <div className="relative size-20 shrink-0 bg-muted/40">
              <Image src={getProductImageUrl(item.image)} alt={item.title} width={80} height={80} className="size-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
              <h4 className="text-[11px] font-medium tracking-[0.18em] text-foreground uppercase">{item.title}</h4>
              {item.variantTitle !== "" && <p className="text-[11px] font-light text-muted-foreground/80 italic">{item.variantTitle}</p>}
              <p className="pt-2 text-[13px] font-light tracking-wide text-foreground tabular-nums">
                {item.qty} x {money(getCartLineUnitPriceCents(item))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
