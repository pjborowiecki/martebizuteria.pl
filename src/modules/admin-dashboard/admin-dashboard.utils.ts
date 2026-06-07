import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { formatDateToIsoDateLocal, isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/_utils/iso-date";

import {
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
  ADMIN_DASHBOARD_MS_PER_DAY,
  ADMIN_DASHBOARD_TREND_PERCENT_SCALE
} from "~/src/modules/admin-dashboard/admin-dashboard.constants";
import type {
  AdminDashboardChartPoint,
  AdminDashboardKpiStat,
  AdminDashboardWeeklyOrderPoint
} from "~/src/modules/admin-dashboard/admin-dashboard.types";

const ZERO_COUNT = 0;
const SINGLE_PRIOR_VALUE = 100;
const DAY_OFFSET = 1;

export interface AdminDashboardComparisonPeriod {
  readonly currentStart: Date;
  readonly previousEnd: Date;
  readonly previousStart: Date;
}

export function resolveAdminDashboardComparisonPeriod(
  referenceDate: Date = new Date(),
  periodDays: number = ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS
): AdminDashboardComparisonPeriod {
  const currentStart = new Date(referenceDate.getTime() - periodDays * ADMIN_DASHBOARD_MS_PER_DAY);
  const comparisonPeriodMultiplier = 2;
  const previousStart = new Date(referenceDate.getTime() - periodDays * comparisonPeriodMultiplier * ADMIN_DASHBOARD_MS_PER_DAY);

  return {
    currentStart,
    previousEnd: currentStart,
    previousStart
  };
}

export function resolveAdminDashboardChartStart(referenceDate: Date, days: number): Date {
  return new Date(referenceDate.getTime() - (days - DAY_OFFSET) * ADMIN_DASHBOARD_MS_PER_DAY);
}

export function resolveAdminDashboardMonthlyChartStart(
  referenceDate: Date = new Date(),
  months: number = ADMIN_DASHBOARD_CHART_MONTHS_1Y
): Date {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (months - MONTH_OFFSET), DAY_OFFSET);
}

const START_OF_YEAR_MONTH_INDEX = 0;
const START_OF_YEAR_DAY = 1;

export function resolveAdminDashboardYearStart(referenceDate: Date = new Date()): Date {
  return new Date(referenceDate.getFullYear(), START_OF_YEAR_MONTH_INDEX, START_OF_YEAR_DAY);
}

export function computeAdminDashboardTrendPercent(current: number, previous: number): number {
  if (previous <= ZERO_COUNT) {
    return current > ZERO_COUNT ? SINGLE_PRIOR_VALUE : ZERO_COUNT;
  }

  return Math.round(((current - previous) / previous) * ADMIN_DASHBOARD_TREND_PERCENT_SCALE);
}

export function buildAdminDashboardKpiStat(current: number, previous: number): AdminDashboardKpiStat {
  return {
    current,
    previous,
    trendPercent: computeAdminDashboardTrendPercent(current, previous)
  };
}

interface DailyAggregateRow {
  readonly dateKey: string;
  readonly orders: number;
  readonly revenue: number;
}

interface MonthlyAggregateRow {
  readonly monthKey: string;
  readonly orders: number;
  readonly revenue: number;
}

const MONTH_OFFSET = 1;
const ISO_MONTH_PAD_WIDTH = 2;

function formatChartDayLabel(dateKey: string, locale: string): string {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(year, month - DAY_OFFSET, day);

  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function formatWeekdayLabel(dateKey: string, locale: string): string {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(year, month - DAY_OFFSET, day);

  return date.toLocaleDateString(locale, { weekday: "short" });
}

export function buildAdminDashboardDailyChartPoints({
  days,
  locale = DEFAULT_LOCALE,
  referenceDate = new Date(),
  rows
}: Readonly<{
  days: number;
  locale?: string;
  referenceDate?: Date;
  rows: readonly DailyAggregateRow[];
}>): AdminDashboardChartPoint[] {
  const rowByDateKey = new Map(rows.map((row) => [row.dateKey, row]));
  const points: AdminDashboardChartPoint[] = [];

  for (let dayIndex = days - DAY_OFFSET; dayIndex >= ZERO_COUNT; dayIndex -= DAY_OFFSET) {
    const date = new Date(referenceDate.getTime() - dayIndex * ADMIN_DASHBOARD_MS_PER_DAY);
    const dateKey = formatDateToIsoDateLocal(date);
    const aggregate = rowByDateKey.get(dateKey);

    points.push({
      dateKey,
      label: formatChartDayLabel(dateKey, locale),
      orders: aggregate?.orders ?? ZERO_COUNT,
      revenue: aggregate?.revenue ?? ZERO_COUNT
    });
  }

  return points;
}

function formatChartMonthLabel(monthKey: string, locale: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const date = new Date(year, month - MONTH_OFFSET, DAY_OFFSET);

  return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

function resolveMonthKey(referenceDate: Date, monthsAgo: number): string {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsAgo, DAY_OFFSET);
  const year = date.getFullYear();
  const month = String(date.getMonth() + MONTH_OFFSET).padStart(ISO_MONTH_PAD_WIDTH, "0");

  return `${year}-${month}`;
}

export function buildAdminDashboardMonthlyChartPoints({
  locale = DEFAULT_LOCALE,
  months = ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  referenceDate = new Date(),
  rows
}: Readonly<{
  locale?: string;
  months?: number;
  referenceDate?: Date;
  rows: readonly MonthlyAggregateRow[];
}>): AdminDashboardChartPoint[] {
  const rowByMonthKey = new Map(rows.map((row) => [row.monthKey, row]));
  const points: AdminDashboardChartPoint[] = [];

  for (let monthIndex = months - DAY_OFFSET; monthIndex >= ZERO_COUNT; monthIndex -= DAY_OFFSET) {
    const monthKey = resolveMonthKey(referenceDate, monthIndex);
    const aggregate = rowByMonthKey.get(monthKey);

    points.push({
      dateKey: monthKey,
      label: formatChartMonthLabel(monthKey, locale),
      orders: aggregate?.orders ?? ZERO_COUNT,
      revenue: aggregate?.revenue ?? ZERO_COUNT
    });
  }

  return points;
}

export function isAdminDashboardCustomChartRangeValid(startDate: string, endDate: string): boolean {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false;
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToEndMs(endDate);
}

export function buildAdminDashboardDailyChartPointsForIsoDateRange({
  endDate,
  locale = DEFAULT_LOCALE,
  rows,
  startDate
}: Readonly<{
  endDate: string;
  locale?: string;
  rows: readonly DailyAggregateRow[];
  startDate: string;
}>): AdminDashboardChartPoint[] {
  const rowByDateKey = new Map(rows.map((row) => [row.dateKey, row]));
  const points: AdminDashboardChartPoint[] = [];
  const startMs = parseIsoDateToStartMs(startDate);
  const endMs = parseIsoDateToStartMs(endDate);

  for (let cursorMs = startMs; cursorMs <= endMs; cursorMs += ADMIN_DASHBOARD_MS_PER_DAY) {
    const dateKey = formatDateToIsoDateLocal(new Date(cursorMs));
    const aggregate = rowByDateKey.get(dateKey);

    points.push({
      dateKey,
      label: formatChartDayLabel(dateKey, locale),
      orders: aggregate?.orders ?? ZERO_COUNT,
      revenue: aggregate?.revenue ?? ZERO_COUNT
    });
  }

  return points;
}

export function buildAdminDashboardWeeklyOrderPoints({
  locale = DEFAULT_LOCALE,
  referenceDate = new Date(),
  rows
}: Readonly<{
  locale?: string;
  referenceDate?: Date;
  rows: readonly DailyAggregateRow[];
}>): AdminDashboardWeeklyOrderPoint[] {
  const dailyPoints = buildAdminDashboardDailyChartPoints({
    days: ADMIN_DASHBOARD_CHART_DAYS_7,
    locale,
    referenceDate,
    rows
  });

  return dailyPoints.map((point) => ({
    dateKey: point.dateKey,
    dayLabel: formatWeekdayLabel(point.dateKey, locale),
    orders: point.orders
  }));
}
