import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getAdminOrdersExport as orderGetAdminOrdersExport } from "~/src/modules/order/order.accessors"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

const buildAdminOrdersExportParams = (input: zod.output<typeof orderZodSchemas.adminOrdersExportInput>) => ({
  filters: {
    createdAt: input.createdAt,
    fulfillment: input.fulfillment,
    payment: input.payment,
    status: input.status,
    total: input.total,
  },
  search: normalizeAdminSearchTerm(input.search),
  statFilter: input.statFilter,
  tab: input.tab,
})

export const exportAdminOrders = createServerFn({
  method: "GET",
})
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrdersExportInput>) => orderZodSchemas.adminOrdersExportInput.parse(input))
  .handler(async ({ data: input }) => {
    const params = buildAdminOrdersExportParams(input)
    const rows = await orderGetAdminOrdersExport(params)

    return rows.map((row) => toAdminOrderListItem(row))
  })
