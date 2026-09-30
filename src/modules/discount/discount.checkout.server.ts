import { countCustomerRedemptions, getDiscountByCode } from "~/src/modules/discount/discount.accessors"
import { type Discount } from "~/src/modules/discount/discount.types"
import { calculateDiscountAmount, normalizeDiscountCode, resolveDiscountRejection } from "~/src/modules/discount/discount.utils"

const NO_AMOUNT = 0

/**
 * The authority on what a code is worth. The storefront's validation response
 * is only ever a preview: this runs again while the payment session is built,
 * so a client that edited the amount, or a code that lapsed or ran out between
 * the two calls, cannot change what is charged. A code that no longer applies
 * is dropped rather than failing the checkout — the buyer still pays full price
 * and keeps their basket.
 */
export const resolveCheckoutDiscount = async ({
  code,
  email,
  itemsSubtotal,
  shippingTotal,
}: ResolveCheckoutDiscountInput): Promise<Discount["applied"] | undefined> => {
  const normalized = code === undefined ? "" : normalizeDiscountCode(code)
  if (normalized === "") {
    return undefined
  }

  const row = await getDiscountByCode(normalized)
  if (row === undefined) {
    return undefined
  }

  const rejection = resolveDiscountRejection({
    itemsSubtotal,
    now: new Date(),
    redeemedByCustomer: await countCustomerRedemptions(row.id, email),
    row,
  })

  if (rejection !== undefined) {
    console.info(`Discount ${normalized} not applied to checkout: ${rejection}.`)

    return undefined
  }

  const amountMinorUnits = calculateDiscountAmount({ itemsSubtotal, row, shippingTotal })
  if (amountMinorUnits <= NO_AMOUNT) {
    return undefined
  }

  return {
    amountMinorUnits,
    code: row.code,
    discountId: row.id,
    type: row.type,
  }
}

interface ResolveCheckoutDiscountInput {
  readonly code: string | undefined
  readonly email: string | undefined
  readonly itemsSubtotal: number
  readonly shippingTotal: number
}
