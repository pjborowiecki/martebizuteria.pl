import type StripeType from "stripe"

import { STRIPE_COUPON_SOURCE, STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { type Discount } from "~/src/modules/discount/discount.types"

export const toSessionDiscounts = async ({
  checkoutId,
  discount,
}: ToSessionDiscountsInput): Promise<StripeType.Checkout.SessionCreateParams.Discount[]> => {
  if (discount === undefined) {
    return []
  }

  const coupon = await stripe.coupons.create({
    amount_off: discount.amountMinorUnits,
    currency: STRIPE_CURRENCY,
    duration: "once",
    metadata: { checkoutId, source: STRIPE_COUPON_SOURCE },
    name: discount.code,
  })

  return [{ coupon: coupon.id }]
}

const deleteCheckoutCoupon = async (coupon: string | SessionCoupon, checkoutId: string): Promise<void> => {
  const couponId = typeof coupon === "string" ? coupon : coupon.id

  try {
    const { metadata } = typeof coupon === "string" ? await stripe.coupons.retrieve(coupon) : coupon
    if (metadata?.["source"] !== STRIPE_COUPON_SOURCE || metadata["checkoutId"] !== checkoutId) {
      return
    }

    await stripe.coupons.del(couponId)
  } catch (error: unknown) {
    console.error(`Failed to delete Stripe coupon ${couponId}:`, error)
  }
}

export const deleteCheckoutCoupons = async ({ checkoutId, discounts }: DeleteCheckoutCouponsInput): Promise<void> => {
  if (checkoutId === undefined || discounts === null || discounts === undefined) {
    return
  }

  await Promise.all(
    discounts.map(async ({ coupon }) => {
      if (coupon !== undefined && coupon !== null) {
        await deleteCheckoutCoupon(coupon, checkoutId)
      }
    }),
  )
}

interface ToSessionDiscountsInput {
  readonly checkoutId: string
  readonly discount: Discount["applied"] | undefined
}

interface SessionCoupon {
  readonly id: string
  readonly metadata: StripeType.Metadata | null
}

interface DeleteCheckoutCouponsInput {
  readonly checkoutId: string | undefined
  readonly discounts: readonly { readonly coupon?: string | SessionCoupon | null }[] | null | undefined
}
