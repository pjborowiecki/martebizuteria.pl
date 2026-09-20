import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { dailyOrderAggregatesQuery } from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import { ADMIN_DASHBOARD_QUERY_KEYS, ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboardChartPoint, type AdminDashboardChartRangeInput } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import {
  buildAdminDashboardDailyChartPointsForIsoDateRange,
  isAdminDashboardCustomChartRangeValid,
} from "~/src/modules/admin-dashboard/admin-dashboard.utils"

import { parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/iso-date"

export const fetchAdminDashboardChartRangeFn = createServerFn({ method: "GET" })
  .validator((input: AdminDashboardChartRangeInput) => input)
  .handler(async ({ data: input }): Promise<readonly AdminDashboardChartPoint[]> => {
    await assertAdmin()
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

export const adminDashboardChartRangeQueryOptions = (input: AdminDashboardChartRangeInput) =>
  queryOptions({
    enabled: isAdminDashboardCustomChartRangeValid(input.startDate, input.endDate),
    queryFn: () => fetchAdminDashboardChartRangeFn({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.CHART_RANGE, input.locale, input.startDate, input.endDate] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })
