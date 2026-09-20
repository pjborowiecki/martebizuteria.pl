import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { recordCatalogProductCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { deleteOrphanProductByHandle, insertProductWithCatalog } from "~/src/modules/product/product.catalog.server"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const createProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()

    await deleteOrphanProductByHandle(data.handle)

    const id = uuidv7()

    await insertProductWithCatalog(data, id).catch(rethrowProductMutationError)

    scheduleProductCatalogInvalidation()
    recordCatalogProductCreatedAudit(data.handle, { resourceId: id })

    return { handle: data.handle, id }
  })
