import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleCollectionCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCollectionUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils"
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { getCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { normalizeOptionalCollectionLocaleMapForSave } from "~/src/modules/product-collection/product-collection.utils"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export const updateCollection = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productCollectionZodSchemas.updateInput>) => productCollectionZodSchemas.updateInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await getCollectionByHandleQuery.execute({
      handle: data.handle,
    })

    if (existing !== undefined && existing.id !== data.id) {
      throw new AppError(ERROR_CODES.CONFLICT, COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)
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
