import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordDiscountUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getDiscountByCode, getDiscountById, updateDiscountById } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_MUTATION_KEYS } from "~/src/modules/discount/discount.constants"
import { toDiscountUpdateValues } from "~/src/modules/discount/discount.persist.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

export const updateDiscount = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof discountZodSchemas.updateDiscountInput>) => discountZodSchemas.updateDiscountInput.parse(input))
  .handler(async ({ data: { id, values } }) => {
    const existing = await getDiscountById(id)
    if (existing === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, DISCOUNT_ERROR_CODES.NOT_FOUND)
    }

    const row = toDiscountUpdateValues(values)
    if (row.code !== existing.code) {
      const codeOwner = await getDiscountByCode(row.code)
      if (codeOwner !== undefined) {
        throw new AppError(ERROR_CODES.CONFLICT, DISCOUNT_ERROR_CODES.CODE_TAKEN)
      }
    }

    await updateDiscountById(id, row)
    recordDiscountUpdatedAudit(row.code, { detail: values.description })

    return { code: row.code, ok: true }
  })

export const updateDiscountMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateDiscount>[0]["data"]) => updateDiscount({ data }),
  mutationKey: DISCOUNT_MUTATION_KEYS.UPDATE,
})
