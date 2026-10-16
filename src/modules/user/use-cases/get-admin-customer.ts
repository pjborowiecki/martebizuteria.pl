import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { type DisplayPreferences } from "~/src/integrations/use-intl/i18n.display"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type CalendarPeriod, formatShortDate } from "~/src/modules/_core/utils/datetime"
import { type AdminDashboardChartWindow, resolveAdminDashboardMonths } from "~/src/modules/admin-dashboard/admin-dashboard.utils"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import {
  getAdminCustomerOrderRowsQuery,
  getCustomerAuditTimelineQuery,
  getCustomerCategoryBreakdownQuery,
  getCustomerMonthlySpendingQuery,
  getCustomerOrderStatsQuery,
  getCustomerPreferredCategoryQuery,
  getCustomerPreferredCollectionQuery,
  getDefaultCustomerAddressFullQuery,
  getLatestSessionActivityQuery,
  getUserById,
} from "~/src/modules/user/user.accessors"
import {
  ADMIN_CUSTOMER_DETAIL_MONTHS,
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_QUERY_STALE_MS,
  USER_QUERY_KEYS,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import {
  buildAdminCustomerMonthlySpendingSeries,
  buildAdminCustomerTimeline,
  formatAdminCustomerFullAddress,
  formatAdminCustomerLastActive,
  mapCustomerOrderStats,
  parseAdminUserMetadata,
  resolveAdminCustomerAverageOrderValue,
  resolveAdminCustomerInitials,
  resolveAdminCustomerReturningRate,
  resolveAdminCustomerTags,
} from "~/src/modules/user/user.utils"
import { userZodSchemas } from "~/src/modules/user/user.zod"

const resolveLocalizedCategoryLabel = (titles: unknown, locale: string): string => {
  const label = resolveCategoryTitle(titles, locale).trim()

  return label === "" ? EMPTY_VALUE : label
}

const resolveLocalizedCollectionLabel = (titles: unknown, locale: string): string | undefined => {
  const label = resolveCollectionTitle(titles, locale).trim()

  return label === "" ? undefined : label
}

const resolveAdminCustomerRoleBadgeKey = (
  role: User["select"]["role"],
  isReturning: boolean,
): User["adminCustomerDetail"]["roleBadgeKey"] => {
  if (role === ROLES.ADMIN) {
    return "roleAdmin"
  }

  if (isReturning) {
    return "returning"
  }

  return "roleCustomer"
}

const loadAdminCustomerDetailQueryResult = async (
  userId: string,
  spendingWindow: AdminDashboardChartWindow,
): Promise<AdminCustomerDetailQueryResult> => {
  const [
    orderStatsRows,
    addressRows,
    sessionRows,
    monthlySpendingRows,
    categoryBreakdownRows,
    preferredCategoryRows,
    preferredCollectionRows,
    orderRows,
    auditRows,
  ] = await Promise.all([
    getCustomerOrderStatsQuery([userId]),
    getDefaultCustomerAddressFullQuery(userId),
    getLatestSessionActivityQuery(userId),
    getCustomerMonthlySpendingQuery(userId, spendingWindow),
    getCustomerCategoryBreakdownQuery(userId),
    getCustomerPreferredCategoryQuery(userId),
    getCustomerPreferredCollectionQuery(userId),
    getAdminCustomerOrderRowsQuery(userId),
    getCustomerAuditTimelineQuery(userId),
  ])

  const statsByUserId = mapCustomerOrderStats(orderStatsRows)

  return {
    addressRow: addressRows[0],
    auditRows,
    categoryBreakdownRows,
    monthlySpendingRows,
    orderRows,
    orderStats: statsByUserId.get(userId),
    preferredCategoryRow: preferredCategoryRows[0],
    preferredCollectionRow: preferredCollectionRows[0],
    sessionRow: sessionRows[0],
  }
}

const buildAdminCustomerDetailPayload = (input: BuildAdminCustomerDetailPayloadInput): User["adminCustomerDetail"] => {
  const { locale, preferences, queryResult, spendingPeriods, userRow } = input
  const orderCount = queryResult.orderStats?.orderCount ?? 0
  const totalSpent = queryResult.orderStats?.totalSpent ?? 0
  const averageOrderValue = resolveAdminCustomerAverageOrderValue(orderCount, totalSpent)
  const returningRate = resolveAdminCustomerReturningRate(orderCount)
  const isReturning = orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS
  const monthlySpending = buildAdminCustomerMonthlySpendingSeries(queryResult.monthlySpendingRows, preferences, spendingPeriods)
  const categoryBreakdown = queryResult.categoryBreakdownRows
    .filter((row) => row.titles !== null)
    .map((row) => ({
      amount: row.amount,
      category: resolveLocalizedCategoryLabel(row.titles, locale),
    }))
    .filter((row) => row.amount > 0)
  const preferredCategory =
    queryResult.preferredCategoryRow?.titles === null || queryResult.preferredCategoryRow?.titles === undefined
      ? undefined
      : resolveLocalizedCategoryLabel(queryResult.preferredCategoryRow.titles, locale)
  const preferredCollection =
    queryResult.preferredCollectionRow?.titles === undefined
      ? undefined
      : resolveLocalizedCollectionLabel(queryResult.preferredCollectionRow.titles, locale)
  const lastActiveAt = queryResult.sessionRow?.lastActiveAt ?? queryResult.orderStats?.lastOrderAt ?? userRow.updatedAt
  const adminMetadata = parseAdminUserMetadata(userRow.metadata)
  const addressForm =
    queryResult.addressRow === undefined
      ? undefined
      : {
          address1: queryResult.addressRow.address1,
          address2: queryResult.addressRow.address2 ?? undefined,
          city: queryResult.addressRow.city,
          countryCode: queryResult.addressRow.countryCode,
          postalCode: queryResult.addressRow.postalCode ?? undefined,
          province: queryResult.addressRow.province ?? undefined,
        }
  return {
    ...userRow,
    address: formatAdminCustomerFullAddress(queryResult.addressRow),
    addressForm,
    averageOrderValue,
    categoryBreakdown,
    customTags: adminMetadata.tags ?? [],
    initials: resolveAdminCustomerInitials(userRow.name),
    isReturning,
    joinDate: formatShortDate(userRow.createdAt, preferences.formatLocale, preferences.timeZone),
    lastActive: formatAdminCustomerLastActive(lastActiveAt, { ...preferences, locale }),
    lastOrderAt: queryResult.orderStats?.lastOrderAt,
    monthlySpending,
    notes: adminMetadata.notes,
    orderCount,
    preferredCategory: preferredCategory === EMPTY_VALUE ? undefined : preferredCategory,
    preferredCollection,
    returningRate,
    roleBadgeKey: resolveAdminCustomerRoleBadgeKey(userRow.role, isReturning),
    tags: resolveAdminCustomerTags(userRow, orderCount),
    timeline: buildAdminCustomerTimeline({
      auditEvents: queryResult.auditRows.map((row) => ({
        action: row.action,
        createdAt: row.createdAt,
        detail: row.detail,
        metadata: row.metadata,
      })),
      createdAt: userRow.createdAt,
      orders: queryResult.orderRows,
      preferences,
    }),
    totalSpent,
  }
}

type AdminCustomerOrderRow = Awaited<ReturnType<typeof getAdminCustomerOrderRowsQuery>>[number]

interface AdminCustomerDetailQueryResult {
  readonly addressRow: Awaited<ReturnType<typeof getDefaultCustomerAddressFullQuery>>[number] | undefined
  readonly categoryBreakdownRows: Awaited<ReturnType<typeof getCustomerCategoryBreakdownQuery>>
  readonly monthlySpendingRows: Awaited<ReturnType<typeof getCustomerMonthlySpendingQuery>>
  readonly orderRows: AdminCustomerOrderRow[]
  readonly orderStats: User["customerOrderStats"] | undefined
  readonly preferredCategoryRow: Awaited<ReturnType<typeof getCustomerPreferredCategoryQuery>>[number] | undefined
  readonly preferredCollectionRow: Awaited<ReturnType<typeof getCustomerPreferredCollectionQuery>>[number] | undefined
  readonly auditRows: Awaited<ReturnType<typeof getCustomerAuditTimelineQuery>>
  readonly sessionRow: Awaited<ReturnType<typeof getLatestSessionActivityQuery>>[number] | undefined
}

interface BuildAdminCustomerDetailPayloadInput {
  readonly locale: string
  readonly preferences: DisplayPreferences
  readonly queryResult: AdminCustomerDetailQueryResult
  readonly spendingPeriods: readonly CalendarPeriod[]
  readonly userRow: User["select"]
}

export const getAdminCustomer = createServerFn({
  method: "GET",
})
  .middleware([authorized({ user: ["get"] })])
  .validator((input: zod.input<typeof userZodSchemas.adminCustomerDetailInput>) => userZodSchemas.adminCustomerDetailInput.parse(input))
  .handler(async ({ data: input }): Promise<User["adminCustomerDetail"] | undefined> => {
    const locale = input.locale ?? I18N.DEFAULT_LOCALE
    const userRow = await getUserById(input.id)
    if (userRow === undefined) {
      return undefined
    }

    const preferences = await resolveRequestDisplayPreferences()
    const spendingWindow = resolveAdminDashboardMonths(new Date(), ADMIN_CUSTOMER_DETAIL_MONTHS, preferences.timeZone)
    const queryResult = await loadAdminCustomerDetailQueryResult(input.id, spendingWindow)

    return buildAdminCustomerDetailPayload({
      locale,
      preferences,
      queryResult,
      spendingPeriods: spendingWindow.periods,
      userRow,
    })
  })

export const getAdminCustomerQuery = (id: string, locale: string) =>
  queryOptions({
    enabled: id !== "",
    queryFn: async () => {
      const detail = await getAdminCustomer({
        data: {
          id,
          locale,
        },
      })

      if (detail === undefined) {
        throw notFound()
      }

      return detail
    },
    queryKey: [...USER_QUERY_KEYS.ADMIN.CUSTOMER_BY_ID, id, locale],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  })
