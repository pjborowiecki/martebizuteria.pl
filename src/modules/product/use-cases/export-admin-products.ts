import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminProductsFilteredList } from "~/src/modules/product/product.accessors"
import { buildAdminProductsFilterParams, loadAdminListAggregates } from "~/src/modules/product/product.admin-list.server"
import { type AdminProductsExportInput } from "~/src/modules/product/product.admin-list.types"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"

export const fetchAdminProductsExportFn = createServerFn({ method: "GET" })
  .validator((input: AdminProductsExportInput) => input)
  .handler(async ({ data: input }) => {
    await assertAdmin()

    const rows = await getAdminProductsFilteredList(buildAdminProductsFilterParams(input))
    const aggregates = await loadAdminListAggregates(rows)

    return rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))
  })
