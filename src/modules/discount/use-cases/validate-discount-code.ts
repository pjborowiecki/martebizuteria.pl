import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { countCustomerRedemptions, getDiscountByCode } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_MUTATION_KEYS, DISCOUNT_REJECTION } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { calculateDiscountAmount, normalizeDiscountCode, resolveDiscountRejection } from "~/src/modules/discount/discount.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

/**
 * Public because a guest must be able to try a code before signing in. It only
 * ever reports whether a code applies and for how much, never the code list,
 * and the amount is recomputed server side when the payment session is built,
 * so a tampered response cannot change what is charged.
 */
export const validateDiscountCode = createServerFn({ method: "POST" })
  .validator((input: zod.input<typeof discountZodSchemas.validateDiscountInput>) => discountZodSchemas.validateDiscountInput.parse(input))
  .handler(async ({ data }): Promise<Discount["validation"]> => {
    const code = normalizeDiscountCode(data.code)
    const row = await getDiscountByCode(code)
    if (row === undefined) {
      return { rejection: DISCOUNT_REJECTION.NOT_FOUND }
    }

    const session = await getRequestSession()
    const email = data.email ?? session?.user.email
    const rejection = resolveDiscountRejection({
      itemsSubtotal: data.itemsSubtotal,
      now: new Date(),
      redeemedByCustomer: await countCustomerRedemptions(row.id, email),
      row,
    })

    if (rejection !== undefined) {
      return { rejection }
    }

    return {
      applied: {
        amountMinorUnits: calculateDiscountAmount({
          itemsSubtotal: data.itemsSubtotal,
          row,
          shippingTotal: data.shippingTotal,
        }),
        code: row.code,
        discountId: row.id,
        type: row.type,
      },
    }
  })

export const validateDiscountCodeMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof validateDiscountCode>[0]["data"]) => validateDiscountCode({ data }),
  mutationKey: DISCOUNT_MUTATION_KEYS.VALIDATE,
})
