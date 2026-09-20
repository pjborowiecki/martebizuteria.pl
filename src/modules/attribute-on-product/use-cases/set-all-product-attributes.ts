import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { replaceAllAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"

export const setAllForProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => attributeOnProductZodSchemas.setAllForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    await replaceAllAttributesForProduct(
      data.productId,
      data.productValues,
      data.variantValues.map((group) => ({ rows: group.values, variantId: group.variantId })),
    )
    return { ok: true, productId: data.productId }
  })
