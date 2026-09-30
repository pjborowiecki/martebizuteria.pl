import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { PRODUCT_MIN_LENGTH } from "~/src/modules/product/product.constants"
import { findTakenSkus } from "~/src/modules/product/product.mutations"

const validateProductSkusSchema = zod.object({
  productId: zod.string().trim().min(PRODUCT_MIN_LENGTH).optional(),
  skus: zod.array(zod.string().trim()),
})

export const validateProductSkus = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof validateProductSkusSchema>) => validateProductSkusSchema.parse(input))
  .handler(async ({ data }) => {
    const takenSkus = await findTakenSkus(data.skus, data.productId)

    return { takenSkus }
  })
