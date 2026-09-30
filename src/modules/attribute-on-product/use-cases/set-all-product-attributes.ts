import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { replaceAllAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"

export const setAllProductAttributes = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof attributeOnProductZodSchemas.setAllForProductInput>) =>
    attributeOnProductZodSchemas.setAllForProductInput.parse(input),
  )
  .handler(async ({ data }) => {
    await replaceAllAttributesForProduct(
      data.productId,
      data.productValues,
      data.variantValues.map((group) => ({ rows: group.values, variantId: group.variantId })),
    )

    return { ok: true, productId: data.productId }
  })
