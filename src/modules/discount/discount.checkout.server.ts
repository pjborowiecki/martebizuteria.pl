import { getDiscountByCodeForCustomerQuery } from "~/src/modules/discount/discount.accessors"
import { type Discount } from "~/src/modules/discount/discount.types"
import { normalizeDiscountCode, resolveAppliedCheckoutDiscount } from "~/src/modules/discount/discount.utils"

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

  return resolveAppliedCheckoutDiscount({
    itemsSubtotal,
    now: new Date(),
    row: await getDiscountByCodeForCustomerQuery(normalized, email),
    shippingTotal,
  })
}

interface ResolveCheckoutDiscountInput {
  readonly code: string | undefined
  readonly email: string | undefined
  readonly itemsSubtotal: number
  readonly shippingTotal: number
}
