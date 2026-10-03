import { type ColumnFiltersState } from "@tanstack/react-table"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { isDateColumnFilterValue, isNumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type DateInput, coerceNumber, formatRelativeFromNow, formatShortDate } from "~/src/modules/_core/utils/datetime"
import { parseJsonRecord, readJsonNumber, readJsonString, tryParseJsonRecord } from "~/src/modules/_core/utils/json"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  ADMIN_CUSTOMER_DETAIL_MONTHS,
  ADMIN_CUSTOMER_DETAIL_TAGS,
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_STAT_FILTER,
  ADMIN_CUSTOMER_TABLE_COLUMN_ID,
  type AdminCustomerDetailTag,
  type AdminCustomerStatFilter,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const resolveAdminCustomerAverageOrderValue = (orderCount: number, totalSpent: number): number => {
  if (orderCount <= 0) {
    return 0
  }

  return Math.round(totalSpent / orderCount)
}

export const resolveAdminCustomerInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0)
  const [first, ...rest] = parts
  if (first === undefined) {
    return "?"
  }

  const last = rest.at(LAST_NAME_PART_OFFSET)
  if (last === undefined) {
    return first.slice(0, DOUBLE_INITIALS_LENGTH).toUpperCase()
  }

  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase()
}

export const formatAdminCustomerLastActive = (lastActiveAt: DateInput | null | undefined, locale: string): string | undefined =>
  lastActiveAt === null || lastActiveAt === undefined ? undefined : formatRelativeFromNow(lastActiveAt, locale)

export const formatAdminCustomerLocation = (address: User["customerAddressRow"] | undefined): string | undefined => {
  if (address === undefined) {
    return undefined
  }

  const locality = [address.city, address.province]
    .filter((part): part is string => part !== null && part !== undefined && part.trim() !== "")
    .join(", ")
  if (locality === "") {
    return address.countryCode
  }

  return `${locality}, ${address.countryCode}`
}

export const toAdminCustomerListItem = (
  row: User["select"],
  orderStats: User["customerOrderStats"] | undefined,
  addressRow: User["customerAddressRow"] | undefined,
): User["adminCustomerListItem"] => {
  const orderCount = orderStats?.orderCount ?? 0
  const totalSpent = orderStats?.totalSpent ?? 0

  return {
    ...row,
    averageOrderValue: resolveAdminCustomerAverageOrderValue(orderCount, totalSpent),
    city: addressRow?.city,
    countryCode: addressRow?.countryCode,
    lastOrderAt: orderStats?.lastOrderAt,
    orderCount,
    province: addressRow?.province ?? undefined,
    totalSpent,
  }
}

export const normalizeAverageProductsPerOrder = (value: number | string | bigint | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }

  return Math.round(Number(value) * ONE_DECIMAL_FACTOR) / ONE_DECIMAL_FACTOR
}

export const computeAdminCustomerStatsFromAggregates = (input: User["adminCustomerAggregateStatsInput"]): User["adminCustomerStats"] => {
  const total = coerceNumber(input.total)
  const customersWithOrders = coerceNumber(input.customersWithOrders)
  const repeatCustomers = coerceNumber(input.repeatCustomers)
  const returningRate = customersWithOrders === 0 ? 0 : Math.round((repeatCustomers / customersWithOrders) * PERCENT_SCALE)

  return {
    averageLtv: Math.round(coerceNumber(input.averageLtv)),
    averageProductsPerOrder: normalizeAverageProductsPerOrder(input.averageProductsPerOrder),
    returningRate,
    total,
  }
}

export const filterAdminCustomersByStat = (
  customers: readonly User["adminCustomerListItem"][],
  filter: AdminCustomerStatFilter | undefined,
): User["adminCustomerListItem"][] => {
  if (filter === undefined) {
    return [...customers]
  }

  if (filter === ADMIN_CUSTOMER_STAT_FILTER.RETURNING) {
    return customers.filter((customer) => customer.orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS)
  }

  return [...customers]
}

export const mapCustomerOrderStats = (
  rows: readonly {
    lastOrderAt: DateInput | null
    orderCount: number | string | bigint | null
    totalSpent: number | string | bigint | null
    userId: string | null
  }[],
): Map<string, User["customerOrderStats"]> =>
  new Map(
    rows
      .filter(
        (
          row,
        ): row is typeof row & {
          userId: string
        } => row.userId !== null,
      )
      .map((row) => [
        row.userId,
        {
          lastOrderAt: parseOrderStatsLastOrderAt(row.lastOrderAt),
          orderCount: coerceNumber(row.orderCount),
          totalSpent: coerceNumber(row.totalSpent),
        },
      ]),
  )

const parseOrderStatsLastOrderAt = (value: DateInput | null): Date | undefined => {
  if (value === null) {
    return undefined
  }

  if (value instanceof Date) {
    return value
  }

  return new Date(value)
}

export const formatAdminCustomerFullAddress = (addressRow: User["adminCustomerFullAddressRow"] | undefined): string | undefined => {
  if (addressRow === undefined) {
    return undefined
  }

  const locality = [addressRow.city, addressRow.province].filter((part): part is string => part !== null && part.trim() !== "").join(", ")
  const postalLine = [addressRow.postalCode, locality].filter((part) => part !== null && part.trim() !== "").join(" ")
  const parts = [addressRow.address1, addressRow.address2, postalLine, addressRow.countryCode].filter(
    (part): part is string => part !== null && part.trim() !== "",
  )

  return parts.length === 0 ? undefined : parts.join(", ")
}

export const resolveAdminCustomerReturningRate = (orderCount: number): number =>
  orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS ? PERCENT_SCALE : 0

export const resolveAdminCustomerTags = (row: User["select"], orderCount: number): AdminCustomerDetailTag[] => {
  const tags: AdminCustomerDetailTag[] = []
  if (row.role === ROLES.ADMIN) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN)
  } else {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER)
  }

  if (orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING)
  }

  if (row.emailVerified) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED)
  }

  if (row.banned === true) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.BANNED)
  }

  return tags
}

const mapAuditRowToTimelineEvent = (
  row: User["adminCustomerAuditTimelineRow"],
  locale: string,
):
  | (User["adminCustomerDetail"]["timeline"][number] & {
      readonly sortAt: number
    })
  | undefined => {
  const metadata = parseJsonRecord(row.metadata)
  const date = formatShortDate(row.createdAt, locale)
  const sortAt = row.createdAt.getTime()

  if (row.action === AUDIT_LOG_ACTION.AUTH_LOGIN) {
    return {
      date,
      kind: "signed_in",
      sortAt,
    }
  }

  if (row.action === AUDIT_LOG_ACTION.AUTH_LOGOUT) {
    return {
      date,
      kind: "signed_out",
      sortAt,
    }
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED) {
    return {
      date,
      kind: "cart_item_added",
      productTitle: readJsonString(metadata, "productTitle", row.detail ?? "Product"),
      quantity: readJsonNumber(metadata, "quantity", 1),
      sortAt,
    }
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED) {
    return {
      date,
      itemCount: readJsonNumber(metadata, "itemCount", 1),
      kind: "cart_abandoned",
      sortAt,
    }
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED) {
    return {
      date,
      kind: "page_viewed",
      path: readJsonString(metadata, "path", row.detail ?? "/"),
      sortAt,
    }
  }

  return undefined
}

export const buildAdminCustomerTimeline = (input: User["adminCustomerTimelineInput"]): User["adminCustomerDetail"]["timeline"] => {
  type TimelineEvent = User["adminCustomerDetail"]["timeline"][number] & {
    readonly sortAt: number
  }

  const events: TimelineEvent[] = [
    {
      date: formatShortDate(input.createdAt, input.locale),
      kind: "account_created",
      sortAt: input.createdAt.getTime(),
    },
  ]

  for (const orderRow of input.orders) {
    events.push({
      date: formatShortDate(orderRow.createdAt, input.locale),
      kind: "order_placed",
      orderId: orderRow.id,
      sortAt: orderRow.createdAt.getTime(),
      total: formatPrice(orderRow.total, orderRow.currencyCode, input.locale),
    })
  }

  for (const auditRow of input.auditEvents ?? []) {
    const mapped = mapAuditRowToTimelineEvent(auditRow, input.locale)
    if (mapped !== undefined) {
      events.push(mapped)
    }
  }

  return events.toSorted((left, right) => right.sortAt - left.sortAt).map(({ sortAt: _sortAt, ...event }) => event)
}

export const buildAdminCustomerMonthlySpendingSeries = (
  rows: readonly {
    amount: number | string | bigint
    monthKey: string | null
  }[],
  locale: string,
  months: number = ADMIN_CUSTOMER_DETAIL_MONTHS,
): User["adminCustomerDetail"]["monthlySpending"] => {
  const amountByMonthKey = new Map(
    rows
      .filter(
        (
          row,
        ): row is typeof row & {
          monthKey: string
        } => row.monthKey !== null,
      )
      .map((row) => [row.monthKey, Number(row.amount)]),
  )

  const series: User["adminCustomerDetail"]["monthlySpending"] = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  cursor.setMonth(cursor.getMonth() - (months - 1))
  for (let index = 0; index < months; index += 1) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(MONTH_KEY_PAD_LENGTH, MONTH_KEY_PAD_CHAR)}`
    series.push({
      amount: amountByMonthKey.get(monthKey) ?? 0,
      month: cursor.toLocaleDateString(locale, {
        month: "short",
      }),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return series
}

export const formatAdminCustomerDetailKpiPrice = (amountMinor: number, locale: string): string =>
  formatPrice(amountMinor, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale)

const PERCENT_SCALE = 100

const ONE_DECIMAL_FACTOR = 10

const DOUBLE_INITIALS_LENGTH = 2

const LAST_NAME_PART_OFFSET = -1

const MONTH_KEY_PAD_LENGTH = 2

const MONTH_KEY_PAD_CHAR = "0"

const normalizeTags = (tags: readonly string[] | undefined): string[] | undefined => {
  if (tags === undefined) {
    return undefined
  }

  const normalized = tags.map((tag) => tag.trim()).filter((tag) => tag !== "")

  return normalized.length === 0 ? undefined : normalized
}

export const parseAdminUserMetadata = (raw: string | null | undefined): User["adminUserMetadata"] => {
  const trimmed = raw?.trim()
  if (trimmed === undefined || trimmed === "") {
    return {}
  }

  const record = tryParseJsonRecord(trimmed)
  const structured =
    record === undefined || !("notes" in record || "tags" in record) ? undefined : userZodSchemas.adminUserMetadata.safeParse(record).data
  if (structured === undefined) {
    return { notes: trimmed }
  }

  const notes = structured.notes?.trim()

  return { notes: notes === "" ? undefined : notes, tags: normalizeTags(structured.tags) }
}

export const serializeAdminUserMetadata = (metadata: User["adminUserMetadata"]): string | undefined => {
  const notes = metadata.notes?.trim()
  const tags = normalizeTags(metadata.tags)
  const hasNotes = notes !== undefined && notes !== ""
  const hasTags = tags !== undefined
  if (!hasNotes && !hasTags) {
    return undefined
  }

  return JSON.stringify({
    notes: hasNotes ? notes : undefined,
    tags: hasTags ? tags : undefined,
  })
}

const isAdminCustomerRole = (value: string): value is (typeof ROLES)[keyof typeof ROLES] =>
  value === ROLES.ADMIN || value === ROLES.CUSTOMER

export const parseAdminCustomersListFilters = (columnFilters: ColumnFiltersState): User["adminCustomersListFilters"] =>
  columnFilters.reduce<User["adminCustomersListFilters"]>((filters, { id, value }) => {
    const handler = ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS[id]

    return handler === undefined ? filters : handler(filters, value)
  }, {})

export const adminCustomersListFiltersNeedOrderRollup = (filters: User["adminCustomersListFilters"]): boolean =>
  filters.totalSpent !== undefined || filters.averageOrderValue !== undefined || filters.lastOrderAt !== undefined

type AdminCustomerColumnFilterHandler = (filters: User["adminCustomersListFilters"], value: unknown) => User["adminCustomersListFilters"]

const applyRoleFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminCustomerRole(value)
    ? {
        ...filters,
        role: value,
      }
    : filters

const applyEmailVerifiedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean"
    ? {
        ...filters,
        emailVerified: value,
      }
    : filters

const applyBannedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean"
    ? {
        ...filters,
        banned: value,
      }
    : filters

const applyTotalSpentFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        totalSpent: value,
      }
    : filters

const applyAverageOrderValueFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        averageOrderValue: value,
      }
    : filters

const applyLastOrderAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        lastOrderAt: value,
      }
    : filters

const applyCreatedAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters

const ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminCustomerColumnFilterHandler>> = {
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue]: applyAverageOrderValueFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned]: applyBannedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified]: applyEmailVerifiedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt]: applyLastOrderAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.role]: applyRoleFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent]: applyTotalSpentFilter,
}
