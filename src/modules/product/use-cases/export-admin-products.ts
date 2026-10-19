import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { recordListExportedAudit } from "~/src/modules/audit-log/use-cases/record-list-export-audit.server"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"
import { productZodSchemas } from "~/src/modules/product/product.zod"
import {
  buildAdminProductsFilterParams,
  getAdminProductsFilteredList,
  loadAdminListAggregates,
} from "~/src/modules/product/use-cases/list-admin-products.server"

export const exportAdminProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productZodSchemas.adminProductsExportInput>) =>
    productZodSchemas.adminProductsExportInput.parse(input),
  )
  .handler(async ({ data: input }) => {
    const { timeZone } = await resolveRequestDisplayPreferences()
    const rows = await getAdminProductsFilteredList(buildAdminProductsFilterParams(input, timeZone))
    const aggregates = await loadAdminListAggregates(rows)
    recordListExportedAudit("products", rows.length, { metadata: { filters: input } })

    return rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))
  })
