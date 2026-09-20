import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"

export const setForProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => attributeOnProductZodSchemas.setForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    await replaceAttributesForProduct(data.productId, data.values)
    return { ok: true, productId: data.productId }
  })
