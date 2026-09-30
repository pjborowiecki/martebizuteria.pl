import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordDiscountCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getDiscountByCode, insertDiscount } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_MUTATION_KEYS } from "~/src/modules/discount/discount.constants"
import { toDiscountInsertValues } from "~/src/modules/discount/discount.persist.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

export const createDiscount = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof discountZodSchemas.createDiscountInput>) => discountZodSchemas.createDiscountInput.parse(input))
  .handler(async ({ data: { values } }) => {
    const row = toDiscountInsertValues(values)
    const existing = await getDiscountByCode(row.code)
    if (existing !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, DISCOUNT_ERROR_CODES.CODE_TAKEN)
    }

    await insertDiscount(row)
    recordDiscountCreatedAudit(row.code, { detail: values.description })

    return { code: row.code, ok: true }
  })

export const createDiscountMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createDiscount>[0]["data"]) => createDiscount({ data }),
  mutationKey: DISCOUNT_MUTATION_KEYS.CREATE,
})
