import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"
import { dailyOrderAggregatesQuery } from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import { ADMIN_DASHBOARD_QUERY_KEYS, ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import {
  buildAdminDashboardDailyChartPointsForIsoDateRange,
  isAdminDashboardCustomChartRangeValid,
} from "~/src/modules/admin-dashboard/admin-dashboard.utils"
import { adminDashboardZodSchemas } from "~/src/modules/admin-dashboard/admin-dashboard.zod"

export const getDashboardChartRange = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof adminDashboardZodSchemas.chartRangeInput>) => adminDashboardZodSchemas.chartRangeInput.parse(input))
  .handler(async ({ data: input }): Promise<readonly AdminDashboard["chartPoint"][]> => {
    const { endDate, locale, startDate } = input

    if (!isAdminDashboardCustomChartRangeValid(startDate, endDate)) {
      return []
    }

    const rangeStart = new Date(parseIsoDateToStartMs(startDate))
    const rangeEnd = new Date(parseIsoDateToEndMs(endDate))
    const dailyAggregateRows = await dailyOrderAggregatesQuery(rangeStart, rangeEnd)

    return buildAdminDashboardDailyChartPointsForIsoDateRange({
      endDate,
      locale,
      rows: dailyAggregateRows,
      startDate,
    })
  })

export const getDashboardChartRangeQuery = (input: AdminDashboard["chartRangeInput"]) =>
  queryOptions({
    enabled: isAdminDashboardCustomChartRangeValid(input.startDate, input.endDate),
    queryFn: () => getDashboardChartRange({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.CHART_RANGE, input.locale, input.startDate, input.endDate],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })
