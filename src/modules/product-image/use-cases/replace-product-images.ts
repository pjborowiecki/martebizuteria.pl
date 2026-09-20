import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { replaceProductImages } from "~/src/modules/product-image/product-image.persist.utils"
import { productImageZodSchemas } from "~/src/modules/product-image/product-image.zod"

export const replaceProductImagesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productImageZodSchemas.replaceForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    await replaceProductImages(data.productId, data.images)
    return { ok: true, productId: data.productId }
  })
