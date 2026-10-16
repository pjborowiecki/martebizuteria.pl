import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { recordListExportedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getAdminOrdersExport as orderGetAdminOrdersExport } from "~/src/modules/order/order.accessors"
import { loadAdminOrderListItems } from "~/src/modules/order/order.admin-list.server"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

const buildAdminOrdersExportParams = (input: zod.output<typeof orderZodSchemas.adminOrdersExportInput>, timeZone: string) => ({
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
  timeZone,
  userId: input.userId,
})

export const exportAdminOrders = createServerFn({
  method: "GET",
})
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrdersExportInput>) => orderZodSchemas.adminOrdersExportInput.parse(input))
  .handler(async ({ data: input }): Promise<Order["adminListItem"][]> => {
    const { timeZone } = await resolveRequestDisplayPreferences()
    const rows = await orderGetAdminOrdersExport(buildAdminOrdersExportParams(input, timeZone))
    recordListExportedAudit("orders", rows.length, { metadata: { filters: input } })

    return loadAdminOrderListItems(rows, getCurrentLocale())
  })
