import { and, eq, inArray, isNull, lt, ne, notExists, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { discountClaim } from "~/src/modules/discount/discount.schema"
import { payment } from "~/src/modules/payment/payment.schema"

const ENDED_CHECKOUT_STATUSES = ["failed", "abandoned"] as const

const ERASED_EMAIL = ""

const ERASED = sql`NULL`

const paymentOfCheckout = db.select({ id: payment.id }).from(payment).where(eq(payment.checkoutId, checkout.id))

const neverOpenedPayment = and(eq(checkout.status, "pending"), notExists(paymentOfCheckout))

const ended = or(inArray(checkout.status, ENDED_CHECKOUT_STATUSES), neverOpenedPayment)

const endedWithContactDetails = (endedBefore: Date) => and(ended, lt(checkout.updatedAt, endedBefore), ne(checkout.email, ERASED_EMAIL))

export const anonymizeEndedCheckouts = async ({ endedBefore, limit }: AnonymizeEndedCheckoutsInput): Promise<number> => {
  const endedCheckouts = await db.select({ id: checkout.id }).from(checkout).where(endedWithContactDetails(endedBefore)).limit(limit)
  if (endedCheckouts.length === 0) {
    return 0
  }

  const checkoutIds = endedCheckouts.map(({ id }) => id)
  const selected = and(inJsonList(checkout.id, checkoutIds), endedWithContactDetails(endedBefore))
  const addressesOfSelected = (column: typeof checkout.billingAddressId | typeof checkout.shippingAddressId) =>
    inArray(address.id, db.select({ id: column }).from(checkout).where(selected))
  const guestAddresses = and(
    isNull(address.userId),
    or(addressesOfSelected(checkout.shippingAddressId), addressesOfSelected(checkout.billingAddressId)),
  )

  const [, anonymized] = await db.batch([
    db.delete(address).where(guestAddresses),
    db
      .update(checkout)
      .set({
        billingAddressId: ERASED,
        billingCompanyName: ERASED,
        billingNip: ERASED,
        customerNote: ERASED,
        email: ERASED_EMAIL,
        lockerId: ERASED,
        lockerPoint: ERASED,
        shippingAddressId: ERASED,
        userId: ERASED,
      })
      .where(selected)
      .returning({ id: checkout.id }),
    db.delete(discountClaim).where(inJsonList(discountClaim.checkoutId, checkoutIds)),
  ])

  return anonymized.length
}

export interface AnonymizeEndedCheckoutsInput {
  readonly endedBefore: Date
  readonly limit: number
}
