import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleCollectionCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCollectionCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { getCollectionByHandleQuery, getMaxRankQuery } from "~/src/modules/product-collection/product-collection.server"
import { toCollectionRow } from "~/src/modules/product-collection/product-collection.utils"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

const NO_RANK = -1

export const createCollection = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["create"] })])
  .validator((input: zod.input<typeof productCollectionZodSchemas.createInput>) => productCollectionZodSchemas.createInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await getCollectionByHandleQuery.execute({
      handle: data.handle,
    })

    if (existing !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)
    }

    const [maxRank] = await getMaxRankQuery.execute()
    const nextRank = (maxRank?.value ?? NO_RANK) + 1
    const id = uuidv7()
    await db.insert(productCollection).values(toCollectionRow(data, id, nextRank))
    scheduleCollectionCatalogInvalidation()
    recordCatalogCollectionCreatedAudit(data.handle)

    return { handle: data.handle, id }
  })
