import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { findTakenSkus } from "~/src/modules/product/product.accessors"
import { PRODUCT_MIN_LENGTH } from "~/src/modules/product/product.constants"

export const validateProductSkusFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        productId: z.string().trim().min(PRODUCT_MIN_LENGTH).optional(),
        skus: z.array(z.string().trim()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await assertAdmin()

    const takenSkus = await findTakenSkus(data.skus, data.productId)
    return { takenSkus }
  })
