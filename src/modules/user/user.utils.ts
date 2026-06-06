import { ROLES } from "~/src/constants/_constants/permissions";

import { formatPrice } from "~/src/lib/_utils/currency";

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants";
import {
  ADMIN_CUSTOMER_DETAIL_MONTHS,
  ADMIN_CUSTOMER_DETAIL_TAGS,
  ADMIN_CUSTOMER_MIN_REPEAT_ORDERS,
  ADMIN_CUSTOMER_STAT_FILTER,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
  type AdminCustomerDetailTag,
  type AdminCustomerStatFilter
} from "~/src/modules/user/user.constants";
import type { User } from "~/src/modules/user/user.types";

const ZERO_COUNT = 0;
const PERCENT_SCALE = 100;
const ONE_DECIMAL_FACTOR = 10;
const INITIALS_PART_LENGTH = 1;
const INITIALS_DOUBLE_MULTIPLIER = 2;
const SINGLE_NAME_PART_COUNT = 1;
const DOUBLE_INITIALS_LENGTH = INITIALS_PART_LENGTH * INITIALS_DOUBLE_MULTIPLIER;
const LAST_NAME_PART_OFFSET = -1;

interface CustomerOrderStats {
  readonly lastOrderAt?: Date;
  readonly orderCount: number;
  readonly totalSpent: number;
}

interface CustomerAddressRow {
  readonly city: string;
  readonly countryCode: string;
  readonly province?: string | null;
}

export function resolveAdminCustomerAverageOrderValue(orderCount: number, totalSpent: number): number {
  if (orderCount <= ZERO_COUNT) {
    return ZERO_COUNT;
  }

  return Math.round(totalSpent / orderCount);
}

export function resolveAdminCustomerInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > ZERO_COUNT);

  if (parts.length === ZERO_COUNT) {
    return "?";
  }

  if (parts.length === SINGLE_NAME_PART_COUNT) {
    return parts[ZERO_COUNT].slice(ZERO_COUNT, DOUBLE_INITIALS_LENGTH).toUpperCase();
  }

  const first = parts[ZERO_COUNT].slice(ZERO_COUNT, INITIALS_PART_LENGTH);
  const last = parts.at(LAST_NAME_PART_OFFSET)?.slice(ZERO_COUNT, INITIALS_PART_LENGTH) ?? "";
  return `${first}${last}`.toUpperCase();
}

export function formatAdminCustomerLocation(address: CustomerAddressRow | undefined): string | undefined {
  if (address === undefined) {
    return undefined;
  }

  const locality = [address.city, address.province]
    .filter((part): part is string => part !== null && part !== undefined && part.trim() !== "")
    .join(", ");
  if (locality === "") {
    return address.countryCode;
  }

  return `${locality}, ${address.countryCode}`;
}

function coerceCount(value: number | string | bigint | null | undefined): number {
  if (value === null || value === undefined) {
    return ZERO_COUNT;
  }

  return Number(value);
}

function coerceSum(value: number | string | bigint | null | undefined): number {
  if (value === null || value === undefined) {
    return ZERO_COUNT;
  }

  return Number(value);
}

export function toAdminCustomerListItem(
  row: User["select"],
  orderStats: CustomerOrderStats | undefined,
  addressRow: CustomerAddressRow | undefined
): User["adminCustomerListItem"] {
  const orderCount = orderStats?.orderCount ?? ZERO_COUNT;
  const totalSpent = orderStats?.totalSpent ?? ZERO_COUNT;

  return {
    ...row,
    averageOrderValue: resolveAdminCustomerAverageOrderValue(orderCount, totalSpent),
    city: addressRow?.city,
    countryCode: addressRow?.countryCode,
    lastOrderAt: orderStats?.lastOrderAt,
    orderCount,
    province: addressRow?.province ?? undefined,
    totalSpent
  };
}

export function normalizeAverageProductsPerOrder(value: number | string | bigint | null | undefined): number {
  if (value === null || value === undefined) {
    return ZERO_COUNT;
  }

  return Math.round(Number(value) * ONE_DECIMAL_FACTOR) / ONE_DECIMAL_FACTOR;
}

interface AdminCustomerAggregateStatsInput {
  readonly averageLtv: number | string | bigint | null | undefined;
  readonly averageProductsPerOrder: number | string | bigint | null | undefined;
  readonly customersWithOrders: number | string | bigint | null | undefined;
  readonly repeatCustomers: number | string | bigint | null | undefined;
  readonly total: number | string | bigint | null | undefined;
}

export function computeAdminCustomerStatsFromAggregates(input: AdminCustomerAggregateStatsInput): User["adminCustomerStats"] {
  const total = coerceCount(input.total);
  const customersWithOrders = coerceCount(input.customersWithOrders);
  const repeatCustomers = coerceCount(input.repeatCustomers);
  const returningRate =
    customersWithOrders === ZERO_COUNT ? ZERO_COUNT : Math.round((repeatCustomers / customersWithOrders) * PERCENT_SCALE);

  return {
    averageLtv: Math.round(coerceSum(input.averageLtv)),
    averageProductsPerOrder: normalizeAverageProductsPerOrder(input.averageProductsPerOrder),
    returningRate,
    total
  };
}

export function filterAdminCustomersByStat(
  customers: readonly User["adminCustomerListItem"][],
  filter: AdminCustomerStatFilter | undefined
): User["adminCustomerListItem"][] {
  if (filter === undefined) {
    return [...customers];
  }

  if (filter === ADMIN_CUSTOMER_STAT_FILTER.RETURNING) {
    return customers.filter((customer) => customer.orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS);
  }

  return [...customers];
}

export function mapCustomerOrderStats(
  rows: readonly {
    lastOrderAt: Date | string | null;
    orderCount: number | string | bigint | null;
    totalSpent: number | string | bigint | null;
    userId: string | null;
  }[]
): Map<string, CustomerOrderStats> {
  return new Map(
    rows
      .filter((row): row is typeof row & { userId: string } => row.userId !== null)
      .map((row) => [
        row.userId,
        {
          lastOrderAt: parseOrderStatsLastOrderAt(row.lastOrderAt),
          orderCount: coerceCount(row.orderCount),
          totalSpent: coerceSum(row.totalSpent)
        }
      ])
  );
}

function parseOrderStatsLastOrderAt(value: Date | string | null): Date | undefined {
  if (value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

interface AdminCustomerFullAddressRow {
  readonly address1: string;
  readonly address2: string | null;
  readonly city: string;
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly province: string | null;
}

export function formatAdminCustomerFullAddress(addressRow: AdminCustomerFullAddressRow | undefined): string | undefined {
  if (addressRow === undefined) {
    return undefined;
  }

  const locality = [addressRow.city, addressRow.province].filter((part): part is string => part !== null && part.trim() !== "").join(", ");
  const postalLine = [addressRow.postalCode, locality].filter((part) => part !== null && part.trim() !== "").join(" ");
  const parts = [addressRow.address1, addressRow.address2, postalLine, addressRow.countryCode].filter(
    (part): part is string => part !== null && part.trim() !== ""
  );

  return parts.length === ZERO_COUNT ? undefined : parts.join(", ");
}

export function formatAdminCustomerJoinDate(createdAt: Date | string, locale: string): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

const RELATIVE_TIME_DIVISORS = {
  day: 86_400_000,
  hour: 3_600_000,
  minute: 60_000
} as const;
const RELATIVE_TIME_NOW = 0;
const RELATIVE_TIME_WEEK_DAYS = 7;
const MONTH_START_DAY = 1;
const MONTH_START_HOUR = 0;
const MONTH_START_MINUTE = 0;
const MONTH_START_SECOND = 0;
const MONTH_START_MILLISECOND = 0;
const MONTH_KEY_PAD_LENGTH = 2;
const MONTH_KEY_PAD_CHAR = "0";
const MONTH_INDEX_OFFSET = 1;
const MONTH_LOOP_STEP = 1;

export function formatAdminCustomerLastActive(lastActiveAt: Date | string | null | undefined, locale: string): string | undefined {
  if (lastActiveAt === null || lastActiveAt === undefined) {
    return undefined;
  }

  const date = lastActiveAt instanceof Date ? lastActiveAt : new Date(lastActiveAt);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < RELATIVE_TIME_DIVISORS.minute) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(RELATIVE_TIME_NOW, "second");
  }

  if (diffMs < RELATIVE_TIME_DIVISORS.hour) {
    const minutes = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.minute);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-minutes, "minute");
  }

  if (diffMs < RELATIVE_TIME_DIVISORS.day) {
    const hours = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.hour);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-hours, "hour");
  }

  if (diffMs < RELATIVE_TIME_DIVISORS.day * RELATIVE_TIME_WEEK_DAYS) {
    const days = Math.floor(diffMs / RELATIVE_TIME_DIVISORS.day);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-days, "day");
  }

  return formatAdminCustomerJoinDate(date, locale);
}

export function resolveAdminCustomerReturningRate(orderCount: number): number {
  return orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS ? PERCENT_SCALE : ZERO_COUNT;
}

export function resolveAdminCustomerTags(row: User["select"], orderCount: number): AdminCustomerDetailTag[] {
  const tags: AdminCustomerDetailTag[] = [];

  if (row.role === ROLES.ADMIN) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN);
  } else {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER);
  }

  if (orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING);
  }

  if (row.emailVerified) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED);
  }

  if (row.banned === true) {
    tags.push(ADMIN_CUSTOMER_DETAIL_TAGS.BANNED);
  }

  return tags;
}

interface AdminCustomerTimelineOrder {
  readonly createdAt: Date;
  readonly currencyCode: string;
  readonly id: string;
  readonly total: number;
}

interface AdminCustomerAuditTimelineRow {
  readonly action: string;
  readonly createdAt: Date;
  readonly detail: string | null;
  readonly metadata: string | null;
}

const SINGLE_ITEM_COUNT = 1;

function isAuditTimelineMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAuditTimelineMetadata(raw: string | null): Record<string, unknown> {
  if (raw === null || raw.trim() === "") {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isAuditTimelineMetadataRecord(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

function coerceAuditTimelineNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function coerceAuditTimelineString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
}

function mapAuditRowToTimelineEvent(
  row: AdminCustomerAuditTimelineRow,
  locale: string
): (User["adminCustomerDetail"]["timeline"][number] & { readonly sortAt: number }) | undefined {
  const metadata = parseAuditTimelineMetadata(row.metadata);
  const date = formatAdminCustomerJoinDate(row.createdAt, locale);
  const sortAt = row.createdAt.getTime();

  if (row.action === AUDIT_LOG_ACTION.AUTH_LOGIN) {
    return { date, kind: "signed_in", sortAt };
  }

  if (row.action === AUDIT_LOG_ACTION.AUTH_LOGOUT) {
    return { date, kind: "signed_out", sortAt };
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED) {
    return {
      date,
      kind: "cart_item_added",
      productTitle: coerceAuditTimelineString(metadata.productTitle, row.detail ?? "Product"),
      quantity: coerceAuditTimelineNumber(metadata.quantity, SINGLE_ITEM_COUNT),
      sortAt
    };
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED) {
    return {
      date,
      itemCount: coerceAuditTimelineNumber(metadata.itemCount, SINGLE_ITEM_COUNT),
      kind: "cart_abandoned",
      sortAt
    };
  }

  if (row.action === AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED) {
    return {
      date,
      kind: "page_viewed",
      path: coerceAuditTimelineString(metadata.path, row.detail ?? "/"),
      sortAt
    };
  }

  return undefined;
}

interface BuildAdminCustomerTimelineInput {
  readonly auditEvents?: readonly AdminCustomerAuditTimelineRow[];
  readonly createdAt: Date;
  readonly locale: string;
  readonly orders: readonly AdminCustomerTimelineOrder[];
}

export function buildAdminCustomerTimeline(input: BuildAdminCustomerTimelineInput): User["adminCustomerDetail"]["timeline"] {
  type TimelineEvent = User["adminCustomerDetail"]["timeline"][number] & { readonly sortAt: number };

  const events: TimelineEvent[] = [
    {
      date: formatAdminCustomerJoinDate(input.createdAt, input.locale),
      kind: "account_created",
      sortAt: input.createdAt.getTime()
    }
  ];

  for (const orderRow of input.orders) {
    events.push({
      date: formatAdminCustomerJoinDate(orderRow.createdAt, input.locale),
      kind: "order_placed",
      orderId: orderRow.id,
      sortAt: orderRow.createdAt.getTime(),
      total: formatPrice(orderRow.total, orderRow.currencyCode, input.locale)
    });
  }

  for (const auditRow of input.auditEvents ?? []) {
    const mapped = mapAuditRowToTimelineEvent(auditRow, input.locale);
    if (mapped !== undefined) {
      events.push(mapped);
    }
  }

  return events.toSorted((left, right) => right.sortAt - left.sortAt).map(({ sortAt: _sortAt, ...event }) => event);
}

export function buildAdminCustomerMonthlySpendingSeries(
  rows: readonly { amount: number | string | bigint; monthKey: string | null }[],
  locale: string,
  months: number = ADMIN_CUSTOMER_DETAIL_MONTHS
): User["adminCustomerDetail"]["monthlySpending"] {
  const amountByMonthKey = new Map(
    rows.filter((row): row is typeof row & { monthKey: string } => row.monthKey !== null).map((row) => [row.monthKey, Number(row.amount)])
  );
  const series: User["adminCustomerDetail"]["monthlySpending"] = [];
  const cursor = new Date();

  cursor.setDate(MONTH_START_DAY);
  cursor.setHours(MONTH_START_HOUR, MONTH_START_MINUTE, MONTH_START_SECOND, MONTH_START_MILLISECOND);
  cursor.setMonth(cursor.getMonth() - (months - MONTH_INDEX_OFFSET));

  for (let index = ZERO_COUNT; index < months; index += MONTH_LOOP_STEP) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + MONTH_INDEX_OFFSET).padStart(MONTH_KEY_PAD_LENGTH, MONTH_KEY_PAD_CHAR)}`;
    series.push({
      amount: amountByMonthKey.get(monthKey) ?? ZERO_COUNT,
      month: cursor.toLocaleDateString(locale, { month: "short" })
    });
    cursor.setMonth(cursor.getMonth() + MONTH_INDEX_OFFSET);
  }

  return series;
}

export function formatAdminCustomerDetailKpiPrice(amountMinor: number, locale: string): string {
  return formatPrice(amountMinor, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale);
}
