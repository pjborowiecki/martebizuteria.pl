import { type JSX, useCallback } from "react"

import { useTranslations } from "use-intl/react"

import { isCheckoutSessionFor } from "~/src/integrations/stripe/stripe.checkout"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { getCartLineUnitPriceCents } from "~/src/modules/cart/cart.utils"
import { computeOrderTotals } from "~/src/modules/order/order.utils"

import { useCartStore } from "~/src/hooks/use-cart-store"
import { useFormatter } from "~/src/hooks/use-display-format"

import { getProductImageUrl } from "~/src/lib/image"

import { CheckoutDiscountCode } from "~/src/presentation/components/custom/checkout/components/checkout-discount-code"
import { CheckoutDiscountField } from "~/src/presentation/components/custom/checkout/components/checkout-discount-field"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import {
  useCheckoutDeliveryPricing,
  useCheckoutDiscountCheck,
} from "~/src/presentation/components/custom/checkout/hooks/use-checkout-delivery-pricing"
import { Image } from "~/src/presentation/components/custom/image"

const useCheckoutSummaryFigures = () => {
  const { checkoutSession, getValues } = useCheckoutForm()
  const { items, cartTotal } = useCartStore()
  const { discountBasket, discountCheck, enteredCode, selectedDeliveryMethod } = useCheckoutDiscountCheck()
  const { priceOf, shortfall } = useCheckoutDeliveryPricing()
  const shared = {
    discountBasket,
    discountCheck,
    enteredCode,
    freeDeliveryShortfall: shortfall,
    hasDeliveryMethod: selectedDeliveryMethod !== undefined,
  }
  if (checkoutSession !== undefined && isCheckoutSessionFor(checkoutSession, { items, values: getValues() })) {
    return { ...shared, isTotalFinal: true, totals: checkoutSession.totals }
  }

  const applied = discountCheck.isSuccess ? discountCheck.data.applied : undefined

  return {
    ...shared,
    isTotalFinal: enteredCode === undefined || discountCheck.isSuccess,
    totals: computeOrderTotals({
      discountTotal: applied?.amountMinorUnits,
      itemsSubtotal: cartTotal(),
      shippingTotal: selectedDeliveryMethod === undefined ? 0 : priceOf(selectedDeliveryMethod.price),
    }),
  }
}

export const CheckoutSummary = (): JSX.Element => {
  const t = useTranslations("pages.checkout")
  const format = useFormatter()
  const { items, itemCount } = useCartStore()
  const { setValue } = useCheckoutForm()
  const { discountBasket, discountCheck, enteredCode, freeDeliveryShortfall, hasDeliveryMethod, isTotalFinal, totals } =
    useCheckoutSummaryFigures()
  const handleDiscountApplied = useCallback(
    (code: string) => {
      setValue("discountCode", code, { shouldDirty: true })
    },
    [setValue],
  )
  const handleDiscountCleared = useCallback(() => {
    setValue("discountCode", "", { shouldDirty: true })
  }, [setValue])

  const money = (cents: number) =>
    format.number(centsToDisplayAmount(cents), {
      currency: "PLN",
      style: "currency",
    })
  const deliveryLabel = (() => {
    if (!hasDeliveryMethod) {
      return t("checkoutSummary.deliveryCalculated")
    }

    return totals.shippingTotal === 0 ? t("checkoutSummary.free") : money(totals.shippingTotal)
  })()

  return (
    <aside className="sticky top-24 border border-border/50 bg-muted/40 p-4 text-card-foreground sm:p-6 md:p-8">
      <div className="space-y-4 text-[12px]">
        <div className="flex justify-between gap-4">
          <span className="font-medium tracking-[0.12em] text-foreground/80 uppercase sm:tracking-[0.18em]">
            {t("checkoutSummary.itemsCount", {
              count: itemCount(),
            })}
          </span>
          <span className="font-light tracking-wider whitespace-nowrap text-foreground tabular-nums">{money(totals.subtotal)}</span>
        </div>
        {totals.discountTotal > 0 && (
          <div className="flex justify-between gap-4 text-emerald-600">
            <span className="font-medium tracking-[0.18em] uppercase">{t("checkoutSummary.discount")}</span>
            <span className="font-light tracking-wider tabular-nums">−{money(totals.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span className="font-medium tracking-[0.18em] uppercase">{t("checkoutSummary.delivery")}</span>
          <span className="font-light tracking-wider tabular-nums">{deliveryLabel}</span>
        </div>
        {freeDeliveryShortfall !== undefined && freeDeliveryShortfall > 0 && (
          <p className="text-right text-[11px] text-muted-foreground">
            {t("checkoutSummary.freeDeliveryShortfall", { amount: money(freeDeliveryShortfall) })}
          </p>
        )}
        <div className="mt-2 flex justify-between gap-4 border-t border-border/30 pt-6">
          <span className="text-[14px] font-medium tracking-[0.18em] text-foreground uppercase">{t("checkoutSummary.total")}</span>
          {isTotalFinal && (
            <span className="text-[14px] font-medium tracking-wider text-foreground tabular-nums">{money(totals.total)}</span>
          )}
          {!isTotalFinal && <span className="text-right text-[12px] text-muted-foreground">{t("checkoutSummary.totalAwaitingCode")}</span>}
        </div>
        {isTotalFinal && (
          <p className="text-right text-[11px] text-muted-foreground">
            {t("checkoutSummary.vatIncluded", { rate: formatVatRatePercent(totals.vatBasisPoints) })} {money(totals.taxTotal)}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-border/30 pt-6">
        {enteredCode !== undefined && <CheckoutDiscountCode check={discountCheck} code={enteredCode} onRemove={handleDiscountCleared} />}
        {enteredCode === undefined && <CheckoutDiscountField basket={discountBasket} onApplied={handleDiscountApplied} />}
      </div>

      <div className="mt-8 space-y-6 border-t border-foreground/20 pt-8">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 sm:gap-5">
            <div className="relative size-16 shrink-0 bg-muted/40 sm:size-20">
              <Image src={getProductImageUrl(item.image)} alt={item.title} width={80} height={80} className="size-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
              <h4 className="text-[11px] font-medium tracking-[0.12em] text-foreground uppercase sm:tracking-[0.18em]">{item.title}</h4>
              {item.variantTitle !== "" && <p className="text-[11px] font-light text-muted-foreground/80 italic">{item.variantTitle}</p>}
              <p className="pt-2 text-[13px] font-light tracking-wide text-foreground tabular-nums">
                {item.qty} x {money(getCartLineUnitPriceCents(item))}
              </p>
              {item.priceChanged === true && (
                <p className="text-[11px] text-muted-foreground" role="status">
                  {t("checkoutSummary.priceChanged")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
