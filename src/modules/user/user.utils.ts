import { ROLES } from "~/src/integrations/better-auth/auth.constants"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  ADMIN_CUSTOMER_DETAIL_MONTHS,
  ADMIN_CUSTOMER_DETAIL_TAGS,
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_STAT_FILTER,
  type AdminCustomerDetailTag,
  type AdminCustomerStatFilter,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { formatPrice } from "~/src/lib/currency"
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
  const [first] = parts
  if (first === undefined) {
    return "?"
  }
  if (parts.length === 1) {
    return first.slice(0, DOUBLE_INITIALS_LENGTH).toUpperCase()
  }
  const last = parts.at(LAST_NAME_PART_OFFSET)?.slice(0, 1) ?? ""
  return `${first.slice(0, 1)}${last}`.toUpperCase()
}
export const formatAdminCustomerLocation = (address: CustomerAddressRow | undefined): string | undefined => {
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
const coerceCount = (value: number | string | bigint | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }
  return Number(value)
}
const coerceSum = (value: number | string | bigint | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }
  return Number(value)
}
export const toAdminCustomerListItem = (
  row: User["select"],
  orderStats: CustomerOrderStats | undefined,
  addressRow: CustomerAddressRow | undefined,
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
export const computeAdminCustomerStatsFromAggregates = (input: AdminCustomerAggregateStatsInput): User["adminCustomerStats"] => {
  const total = coerceCount(input.total)
  const customersWithOrders = coerceCount(input.customersWithOrders)
  const repeatCustomers = coerceCount(input.repeatCustomers)
  const returningRate = customersWithOrders === 0 ? 0 : Math.round((repeatCustomers / customersWithOrders) * PERCENT_SCALE)
  return {
    averageLtv: Math.round(coerceSum(input.averageLtv)),
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
    lastOrderAt: Date | string | null
    orderCount: number | string | bigint | null
    totalSpent: number | string | bigint | null
    userId: string | null
  }[],
): Map<string, CustomerOrderStats> =>
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
          orderCount: coerceCount(row.orderCount),
          totalSpent: coerceSum(row.totalSpent),
        },
      ]),
  )

const parseOrderStatsLastOrderAt = (value: Date | string | null): Date | undefined => {
  if (value === null) {
    return undefined
  }
  if (value instanceof Date) {
    return value
  }
  return new Date(value)
}
export const formatAdminCustomerFullAddress = (addressRow: AdminCustomerFullAddressRow | undefined): string | undefined => {
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
export const formatAdminCustomerJoinDate = (createdAt: Date | string, locale: string): string => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
export const formatAdminCustomerLastActive = (lastActiveAt: Date | string | null | undefined, locale: string): string | undefined => {
  if (lastActiveAt === null || lastActiveAt === undefined) {
    return undefined
  }
  const date = lastActiveAt instanceof Date ? lastActiveAt : new Date(lastActiveAt)
  const diffMs = Date.now() - date.getTime()
  if (diffMs < RELATIVE_TIME_DIVISORS.minute) {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(0, "second")
  }
  if (diffMs < RELATIVE_TIME_DIVISORS.hour) {
    const minutes = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.minute)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-minutes, "minute")
  }
  if (diffMs < RELATIVE_TIME_DIVISORS.day) {
    const hours = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.hour)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-hours, "hour")
  }
  if (diffMs < RELATIVE_TIME_DIVISORS.day * RELATIVE_TIME_WEEK_DAYS) {
    const days = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.day)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-days, "day")
  }
  return formatAdminCustomerJoinDate(date, locale)
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
const isAuditTimelineMetadataRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const parseAuditTimelineMetadata = (raw: string | null): Record<string, unknown> => {
  if (raw === null || raw.trim() === "") {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isAuditTimelineMetadataRecord(parsed)) {
      return parsed
    }
  } catch {
    return {}
  }
  return {}
}
const coerceAuditTimelineNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return fallback
}
const coerceAuditTimelineString = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim() !== "") {
    return value
  }
  return fallback
}
const mapAuditRowToTimelineEvent = (
  row: AdminCustomerAuditTimelineRow,
  locale: string,
):
  | (User["adminCustomerDetail"]["timeline"][number] & {
      readonly sortAt: number
    })
  | undefined => {
  const metadata = parseAuditTimelineMetadata(row.metadata)
  const date = formatAdminCustomerJoinDate(row.createdAt, locale)
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
      productTitle: coerceAuditTimelineString(metadata["productTitle"], row.detail ?? "Product"),
      quantity: coerceAuditTimelineNumber(metadata["quantity"], 1),
      sortAt,
    }
  }
  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED) {
    return {
      date,
      itemCount: coerceAuditTimelineNumber(metadata["itemCount"], 1),
      kind: "cart_abandoned",
      sortAt,
    }
  }
  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED) {
    return {
      date,
      kind: "page_viewed",
      path: coerceAuditTimelineString(metadata["path"], row.detail ?? "/"),
      sortAt,
    }
  }
  return undefined
}
export const buildAdminCustomerTimeline = (input: BuildAdminCustomerTimelineInput): User["adminCustomerDetail"]["timeline"] => {
  type TimelineEvent = User["adminCustomerDetail"]["timeline"][number] & {
    readonly sortAt: number
  }
  const events: TimelineEvent[] = [
    {
      date: formatAdminCustomerJoinDate(input.createdAt, input.locale),
      kind: "account_created",
      sortAt: input.createdAt.getTime(),
    },
  ]
  for (const orderRow of input.orders) {
    events.push({
      date: formatAdminCustomerJoinDate(orderRow.createdAt, input.locale),
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
interface CustomerOrderStats {
  readonly lastOrderAt?: Date | undefined
  readonly orderCount: number
  readonly totalSpent: number
}
interface CustomerAddressRow {
  readonly city: string
  readonly countryCode: string
  readonly province?: string | null | undefined
}
interface AdminCustomerAggregateStatsInput {
  readonly averageLtv: number | string | bigint | null | undefined
  readonly averageProductsPerOrder: number | string | bigint | null | undefined
  readonly customersWithOrders: number | string | bigint | null | undefined
  readonly repeatCustomers: number | string | bigint | null | undefined
  readonly total: number | string | bigint | null | undefined
}
interface AdminCustomerFullAddressRow {
  readonly address1: string
  readonly address2: string | null
  readonly city: string
  readonly countryCode: string
  readonly postalCode: string | null
  readonly province: string | null
}
const RELATIVE_TIME_DIVISORS = {
  day: 86_400_000,
  hour: 3_600_000,
  minute: 60_000,
} as const
const RELATIVE_TIME_WEEK_DAYS = 7
const MONTH_KEY_PAD_LENGTH = 2
const MONTH_KEY_PAD_CHAR = "0"
interface AdminCustomerTimelineOrder {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly id: string
  readonly total: number
}
interface AdminCustomerAuditTimelineRow {
  readonly action: string
  readonly createdAt: Date
  readonly detail: string | null
  readonly metadata: string | null
}
interface BuildAdminCustomerTimelineInput {
  readonly auditEvents?: readonly AdminCustomerAuditTimelineRow[]
  readonly createdAt: Date
  readonly locale: string
  readonly orders: readonly AdminCustomerTimelineOrder[]
}
