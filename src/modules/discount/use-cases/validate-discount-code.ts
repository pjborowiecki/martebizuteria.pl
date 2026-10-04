import { mutationOptions, queryOptions, skipToken } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { getDiscountByCodeForCustomerQuery } from "~/src/modules/discount/discount.accessors"
import {
  DISCOUNT_MUTATION_KEYS,
  DISCOUNT_QUERY_KEYS,
  DISCOUNT_QUERY_STALE_MS,
  DISCOUNT_REJECTION,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { calculateDiscountAmount, normalizeDiscountCode, resolveDiscountRejection } from "~/src/modules/discount/discount.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

export const validateDiscountCode = createServerFn({ method: "POST" })
  .validator((input: ValidateDiscountInput) => discountZodSchemas.validateDiscountInput.parse(input))
  .handler(async ({ data }): Promise<Discount["validation"]> => {
    const session = data.email === undefined ? await getRequestSession() : undefined
    const email = data.email ?? session?.user.email
    const row = await getDiscountByCodeForCustomerQuery(normalizeDiscountCode(data.code), email)
    if (row === undefined) {
      return { rejection: DISCOUNT_REJECTION.NOT_FOUND }
    }

    const rejection = resolveDiscountRejection({ itemsSubtotal: data.itemsSubtotal, now: new Date(), row })

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

export const validateDiscountCodeQuery = ({ code, ...basket }: ValidateDiscountCodeQueryInput) =>
  queryOptions({
    queryFn: code === undefined || code === "" ? skipToken : () => validateDiscountCode({ data: { ...basket, code } }),
    queryKey: [...DISCOUNT_QUERY_KEYS.VALIDATION, { ...basket, code }],
    staleTime: DISCOUNT_QUERY_STALE_MS,
  })

export const validateDiscountCodeMutation = mutationOptions({
  mutationFn: async (data: ValidateDiscountInput, { client }) => {
    const result = await validateDiscountCode({ data })
    client.setQueryData(validateDiscountCodeQuery(data).queryKey, result)

    return result
  },
  mutationKey: DISCOUNT_MUTATION_KEYS.VALIDATE,
})

type ValidateDiscountInput = zod.input<typeof discountZodSchemas.validateDiscountInput>

interface ValidateDiscountCodeQueryInput extends Omit<ValidateDiscountInput, "code"> {
  readonly code: string | undefined
}
