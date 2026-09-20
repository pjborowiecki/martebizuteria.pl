import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { type AdminCustomersListParams, getAdminCustomersFilteredList } from "~/src/modules/user/user.accessors"
import { type AdminCustomersExportInput } from "~/src/modules/user/user.admin-list.types"
import { mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"

import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"
const buildAdminCustomersExportParams = (
  input: AdminCustomersExportInput,
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
export const fetchAdminCustomersExportFn = createServerFn({
  method: "GET",
})
  .validator((input: AdminCustomersExportInput) => input)
  .handler(async ({ data: input }) => {
    await assertAdmin()
    const params = buildAdminCustomersExportParams(input)
    const { addresses, orderStats, rows } = await getAdminCustomersFilteredList(params)
    const statsByUserId = mapCustomerOrderStats(orderStats)
    const addressByUserId = new Map(
      addresses
        .filter((row) => row.userId !== null)
        .map((row) => [
          row.userId!,
          {
            city: row.city,
            countryCode: row.countryCode,
            province: row.province,
          },
        ]),
    )
    return rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)))
  })
