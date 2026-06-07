import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { adminDashboardAccessors } from "~/src/modules/admin-dashboard/admin-dashboard.accessors";
import { ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants";
import type {
  AdminDashboardChartPoint,
  AdminDashboardChartRangeInput,
  AdminDashboardSnapshot
} from "~/src/modules/admin-dashboard/admin-dashboard.types";
import { isAdminDashboardCustomChartRangeValid } from "~/src/modules/admin-dashboard/admin-dashboard.utils";

export interface AdminDashboardInput {
  readonly locale: string;
}

function getAdminDashboardSnapshot(input: AdminDashboardInput): Promise<AdminDashboardSnapshot> {
  return adminDashboardAccessors.getAdminDashboardSnapshot(input.locale);
}

const fetchAdminDashboardSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminDashboardInput) => input)
  .handler(({ data }) => getAdminDashboardSnapshot(data));

function getAdminDashboardChartRange(input: AdminDashboardChartRangeInput): Promise<readonly AdminDashboardChartPoint[]> {
  return adminDashboardAccessors.getAdminDashboardChartRange(input);
}

const fetchAdminDashboardChartRangeFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminDashboardChartRangeInput) => input)
  .handler(({ data }) => getAdminDashboardChartRange(data));

export const adminDashboardQueries = {
  fetchAdminDashboardChartRangeFn,
  fetchAdminDashboardSnapshotFn
};

export const adminDashboardQueryOptions = {
  adminDashboardChartRangeQueryOptions: (input: AdminDashboardChartRangeInput) =>
    queryOptions({
      enabled: isAdminDashboardCustomChartRangeValid(input.startDate, input.endDate),
      queryFn: () => fetchAdminDashboardChartRangeFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.ADMIN_DASHBOARD.CHART_RANGE, input.locale, input.startDate, input.endDate] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS
    }),
  adminDashboardSnapshotQueryOptions: (input: AdminDashboardInput) =>
    queryOptions({
      queryFn: () => fetchAdminDashboardSnapshotFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.ADMIN_DASHBOARD.SNAPSHOT, input.locale] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS
    })
};
