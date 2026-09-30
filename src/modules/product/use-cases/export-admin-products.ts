import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminProductsFilteredList } from "~/src/modules/product/product.accessors"
import { buildAdminProductsFilterParams, loadAdminListAggregates } from "~/src/modules/product/product.admin-list.server"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const exportAdminProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productZodSchemas.adminProductsExportInput>) =>
    productZodSchemas.adminProductsExportInput.parse(input),
  )
  .handler(async ({ data: input }) => {
    const rows = await getAdminProductsFilteredList(buildAdminProductsFilterParams(input))
    const aggregates = await loadAdminListAggregates(rows)

    return rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))
  })
