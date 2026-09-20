import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminOrdersExport as orderGetAdminOrdersExport } from "~/src/modules/order/order.accessors"
import { type AdminOrdersExportInput } from "~/src/modules/order/order.admin-list.types"
import { isAdminOrderTab } from "~/src/modules/order/order.constants"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"
const buildAdminOrdersExportParams = (input: AdminOrdersExportInput) => {
  const tab = input.tab !== undefined && isAdminOrderTab(input.tab) ? input.tab : undefined
  return {
    filters: {
      createdAt: input.createdAt,
      fulfillment: input.fulfillment,
      payment: input.payment,
      status: input.status,
      total: input.total,
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter,
    tab,
  }
}
export const fetchAdminOrdersExportFn = createServerFn({
  method: "GET",
})
  .validator((input: AdminOrdersExportInput) => input)
  .handler(async ({ data: input }) => {
    await assertAdmin()
    const params = buildAdminOrdersExportParams(input)
    const rows = await orderGetAdminOrdersExport(params)
    return rows.map((row) => toAdminOrderListItem(row))
  })
