import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "use-intl";

import { useAdminDashboardSnapshot } from "~/src/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot";

import { adminDashboardQueryOptions } from "~/src/modules/admin-dashboard/admin-dashboard.queries";
import type { AdminDashboardChartPoint } from "~/src/modules/admin-dashboard/admin-dashboard.types";
import { isAdminDashboardCustomChartRangeValid } from "~/src/modules/admin-dashboard/admin-dashboard.utils";

export type DashboardChartRange = "7d" | "30d" | "1y" | "custom";

export interface DashboardCustomChartRange {
  readonly endDate: string;
  readonly startDate: string;
}

const DEFAULT_CHART_RANGE: DashboardChartRange = "30d";

export function useDashboardChartRange(): {
  readonly applyCustomRange: (range: DashboardCustomChartRange) => void;
  readonly chartData: readonly AdminDashboardChartPoint[];
  readonly chartRange: DashboardChartRange;
  readonly clearCustomRange: () => void;
  readonly customRange: DashboardCustomChartRange | undefined;
  readonly isCustomLoading: boolean;
  readonly selectPresetRange: (range: Exclude<DashboardChartRange, "custom">) => void;
} {
  const locale = useLocale();
  const { data: snapshot } = useAdminDashboardSnapshot();
  const [chartRange, setChartRange] = useState<DashboardChartRange>(DEFAULT_CHART_RANGE);
  const [customRange, setCustomRange] = useState<DashboardCustomChartRange | undefined>();

  const customChartQuery = useQuery({
    ...adminDashboardQueryOptions.adminDashboardChartRangeQueryOptions({
      endDate: customRange?.endDate ?? "",
      locale,
      startDate: customRange?.startDate ?? ""
    }),
    enabled:
      chartRange === "custom" &&
      customRange !== undefined &&
      isAdminDashboardCustomChartRangeValid(customRange.startDate, customRange.endDate)
  });

  const presetChartData = useMemo((): readonly AdminDashboardChartPoint[] => {
    switch (chartRange) {
      case "7d": {
        return snapshot.chartPoints7d;
      }
      case "30d": {
        return snapshot.chartPoints30d;
      }
      case "1y": {
        return snapshot.chartPoints1y;
      }
      case "custom": {
        return [];
      }
    }
  }, [chartRange, snapshot.chartPoints1y, snapshot.chartPoints30d, snapshot.chartPoints7d]);

  const chartData = chartRange === "custom" ? (customChartQuery.data ?? []) : presetChartData;
  const isCustomLoading = chartRange === "custom" && customChartQuery.isFetching;

  const selectPresetRange = (range: Exclude<DashboardChartRange, "custom">): void => {
    setChartRange(range);
  };

  const applyCustomRange = (range: DashboardCustomChartRange): void => {
    setCustomRange(range);
    setChartRange("custom");
  };

  const clearCustomRange = (): void => {
    setCustomRange(undefined);
    setChartRange(DEFAULT_CHART_RANGE);
  };

  return {
    applyCustomRange,
    chartData,
    chartRange,
    clearCustomRange,
    customRange,
    isCustomLoading,
    selectPresetRange
  };
}
