import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { recordDiscountDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { deleteDiscountsByIds } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_MUTATION_KEYS } from "~/src/modules/discount/discount.constants"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

export const deleteDiscounts = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof discountZodSchemas.deleteDiscountsInput>) => discountZodSchemas.deleteDiscountsInput.parse(input))
  .handler(async ({ data: { ids } }) => {
    const deleted = await deleteDiscountsByIds(ids)
    recordDiscountDeletedAudit(String(deleted), { metadata: { ids: [...ids] } })

    return { deleted, ok: true }
  })

export const deleteDiscountsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteDiscounts>[0]["data"]) => deleteDiscounts({ data }),
  mutationKey: DISCOUNT_MUTATION_KEYS.DELETE,
})
