import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCatalogCollectionCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { getCollectionByHandleQuery, getMaxRankQuery } from "~/src/modules/product-collection/product-collection.server"
import { toCollectionRow } from "~/src/modules/product-collection/product-collection.utils"
import { collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

import { scheduleCollectionCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

const NO_RANK = -1

export const createCollectionFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => collectionZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getCollectionByHandleQuery.execute({
      handle: data.handle,
    })
    if (existing !== undefined) {
      throw new Error(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)
    }
    const [maxRank] = await getMaxRankQuery.execute()
    const nextRank = (maxRank?.value ?? NO_RANK) + 1
    const id = uuidv7()
    await db.insert(productCollection).values(toCollectionRow(data, id, nextRank))
    scheduleCollectionCatalogInvalidation()
    recordCatalogCollectionCreatedAudit(data.handle)
    return { handle: data.handle, id }
  })
