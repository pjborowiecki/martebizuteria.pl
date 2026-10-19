import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { orderAggregatesQuery } from "~/src/modules/order/order.accessors"
import {
  ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
} from "~/src/modules/order/order.constants"
import { type AdminDashboard } from "~/src/modules/order/order.types"
import {
  buildAdminDashboardChartPoints,
  isAdminDashboardCustomChartRangeValid,
  resolveAdminDashboardDateRange,
} from "~/src/modules/order/order.utils"
import { adminDashboardZodSchemas } from "~/src/modules/order/order.zod"

export const getDashboardChartRange = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof adminDashboardZodSchemas.chartRangeInput>) => adminDashboardZodSchemas.chartRangeInput.parse(input))
  .handler(async ({ data: input }): Promise<readonly AdminDashboard["chartPoint"][]> => {
    const { endDate, startDate } = input

    if (!isAdminDashboardCustomChartRangeValid(startDate, endDate)) {
      return []
    }

    const { formatLocale, timeZone } = await resolveRequestDisplayPreferences()
    const days = resolveAdminDashboardDateRange(startDate, endDate, timeZone)
    const dailyAggregateRows = await orderAggregatesQuery(days)

    return buildAdminDashboardChartPoints({
      formatLocale,
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: dailyAggregateRows,
      timeZone,
    })
  })

export const getDashboardChartRangeQuery = (input: AdminDashboard["chartRangeInput"]) =>
  queryOptions({
    enabled: isAdminDashboardCustomChartRangeValid(input.startDate, input.endDate),
    queryFn: () => getDashboardChartRange({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.CHART_RANGE, input.startDate, input.endDate],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })
