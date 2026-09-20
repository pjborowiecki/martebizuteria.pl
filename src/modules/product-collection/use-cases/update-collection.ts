import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCatalogCollectionUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils"
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { getCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { normalizeOptionalCollectionLocaleMapForSave } from "~/src/modules/product-collection/product-collection.utils"
import { collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

import { scheduleCollectionCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const updateCollectionFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => collectionZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getCollectionByHandleQuery.execute({
      handle: data.handle,
    })
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)
    }
    const { descriptions, handle, id, image, status, titles } = data
    await db
      .update(productCollection)
      .set({
        descriptions: normalizeOptionalCollectionLocaleMapForSave(descriptions),
        handle,
        image: image === "" ? undefined : image,
        status,
        titles: normalizeProductAttributeLocaleMapForSave(titles),
      })
      .where(eq(productCollection.id, id))
    scheduleCollectionCatalogInvalidation()
    recordCatalogCollectionUpdatedAudit(handle)
    return { handle, id }
  })
