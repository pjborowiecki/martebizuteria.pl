import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { type AdminCustomersListParams, getAdminCustomersFilteredList } from "~/src/modules/user/user.accessors"
import { mapCustomerLocations, mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"
import { userZodSchemas } from "~/src/modules/user/user.zod"

const buildAdminCustomersExportParams = (
  input: zod.output<typeof userZodSchemas.adminCustomersExportInput>,
): Pick<AdminCustomersListParams, "search" | "statFilter" | "filters"> => ({
  filters: {
    averageOrderValue: input.averageOrderValue,
    banned: input.banned,
    createdAt: input.createdAt,
    emailVerified: input.emailVerified,
    lastOrderAt: input.lastOrderAt,
    role: input.role,
    totalSpent: input.totalSpent,
  },
  search: normalizeAdminSearchTerm(input.search),
  statFilter: input.statFilter,
})

export const exportAdminCustomers = createServerFn({
  method: "GET",
})
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof userZodSchemas.adminCustomersExportInput>) => userZodSchemas.adminCustomersExportInput.parse(input))
  .handler(async ({ data: input }) => {
    const params = buildAdminCustomersExportParams(input)
    const { defaultAddresses, latestShippingAddresses, orderStats, rows } = await getAdminCustomersFilteredList(params)
    const statsByUserId = mapCustomerOrderStats(orderStats)
    const locationByUserId = mapCustomerLocations(defaultAddresses, latestShippingAddresses)

    return rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), locationByUserId.get(row.id)))
  })
