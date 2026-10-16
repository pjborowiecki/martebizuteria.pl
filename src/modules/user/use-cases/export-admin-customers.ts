import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { recordListExportedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { type AdminCustomersListParams, getAdminCustomersFilteredList } from "~/src/modules/user/user.accessors"
import { mapCustomerLocations, mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"
import { userZodSchemas } from "~/src/modules/user/user.zod"

const buildAdminCustomersExportParams = (
  input: zod.output<typeof userZodSchemas.adminCustomersExportInput>,
  timeZone: string,
): Pick<AdminCustomersListParams, "search" | "statFilter" | "filters" | "timeZone"> => ({
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
  timeZone,
})

export const exportAdminCustomers = createServerFn({
  method: "GET",
})
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof userZodSchemas.adminCustomersExportInput>) => userZodSchemas.adminCustomersExportInput.parse(input))
  .handler(async ({ data: input }) => {
    const { timeZone } = await resolveRequestDisplayPreferences()
    const params = buildAdminCustomersExportParams(input, timeZone)
    const { defaultAddresses, latestShippingAddresses, orderStats, rows } = await getAdminCustomersFilteredList(params)
    const statsByUserId = mapCustomerOrderStats(orderStats)
    const locationByUserId = mapCustomerLocations(defaultAddresses, latestShippingAddresses)
    recordListExportedAudit("customers", rows.length, { metadata: { filters: input } })

    return rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), locationByUserId.get(row.id)))
  })
