import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { syncThumbnailsForProductIds } from "~/src/modules/product-image/product-image.persist.utils"
import { productImage } from "~/src/modules/product-image/product-image.schema"
import { getProductIdsForImageIds } from "~/src/modules/product-image/product-image.server"
import { productImageZodSchemas } from "~/src/modules/product-image/product-image.zod"
const setProductImageRanks = async (
  updates: {
    id: string
    rank: number
  }[],
): Promise<void> => {
  if (updates.length === 0) {
    return
  }
  await Promise.all(
    updates.map((entry) =>
      db
        .update(productImage)
        .set({
          rank: entry.rank,
        })
        .where(eq(productImage.id, entry.id)),
    ),
  )
  const productIds = await getProductIdsForImageIds(updates.map((entry) => entry.id))
  await syncThumbnailsForProductIds(productIds)
}
export const reorderProductImagesFn = createServerFn({
  method: "POST",
})
  .validator((data: unknown) => productImageZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin()
    const updates = orderedIds.map((id, rank) => ({
      id,
      rank,
    }))
    await setProductImageRanks(updates)
    return {
      ok: true,
    }
  })
