import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { loadAttributeOnProductRows, prepareAttributeOnProductBatch } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"

export const setAllProductAttributes = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof attributeOnProductZodSchemas.setAllForProductInput>) =>
    attributeOnProductZodSchemas.setAllForProductInput.parse(input),
  )
  .handler(async ({ data }) => {
    const rows = await loadAttributeOnProductRows(
      data.productId,
      data.productValues,
      data.variantValues.map((group) => ({ rows: group.values, variantId: group.variantId })),
    )
    await runDrizzleBatch(prepareAttributeOnProductBatch(data.productId, rows))

    return { ok: true, productId: data.productId }
  })
