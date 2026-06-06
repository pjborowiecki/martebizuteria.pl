import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";
import { ROLES } from "~/src/constants/_constants/permissions";

import { formatPrice } from "~/src/lib/_utils/currency";

import {
  formatAdminOrderDate,
  resolveAdminOrderFulfillmentUiKey,
  resolveAdminOrderPaymentUiKey
} from "~/src/modules/order/order.display.utils";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { userAccessors } from "~/src/modules/user/user.accessors";
import { userAdminCustomerDetailAccessors } from "~/src/modules/user/user.admin-customer-detail.accessors.server";
import { ADMIN_CUSTOMER_MIN_REPEAT_ORDERS } from "~/src/modules/user/user.constants";
import { parseAdminUserMetadata } from "~/src/modules/user/user.metadata.utils";
import type { User } from "~/src/modules/user/user.types";
import {
  buildAdminCustomerMonthlySpendingSeries,
  buildAdminCustomerTimeline,
  formatAdminCustomerFullAddress,
  formatAdminCustomerJoinDate,
  formatAdminCustomerLastActive,
  mapCustomerOrderStats,
  resolveAdminCustomerAverageOrderValue,
  resolveAdminCustomerInitials,
  resolveAdminCustomerReturningRate,
  resolveAdminCustomerTags
} from "~/src/modules/user/user.utils";

const EMPTY_LENGTH = 0;
const FIRST_ROW_INDEX = 0;
const MONTH_OFFSET = 1;
const MONTH_START_DAY = 1;
const MONTH_START_HOUR = 0;
const MONTH_START_MINUTE = 0;
const MONTH_START_SECOND = 0;
const MONTH_START_MILLISECOND = 0;
const UNCATEGORIZED_LABEL = "—";

export interface AdminCustomerDetailInput {
  readonly id: string;
  readonly locale?: string;
}

type AdminCustomerOrderRow = Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getAdminCustomerOrderRowsQuery>>[number];

interface CustomerOrderStats {
  readonly lastOrderAt?: Date;
  readonly orderCount: number;
  readonly totalSpent: number;
}

interface AdminCustomerDetailQueryResult {
  readonly addressRow: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getDefaultCustomerAddressFullQuery>>[number] | undefined;
  readonly categoryBreakdownRows: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getCustomerCategoryBreakdownQuery>>;
  readonly itemTitleRows: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getOrderItemTitlesQuery>>;
  readonly monthlySpendingRows: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getCustomerMonthlySpendingQuery>>;
  readonly orderRows: AdminCustomerOrderRow[];
  readonly orderStats: CustomerOrderStats | undefined;
  readonly preferredCategoryRow:
    | Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getCustomerPreferredCategoryQuery>>[number]
    | undefined;
  readonly preferredCollectionRow:
    | Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getCustomerPreferredCollectionQuery>>[number]
    | undefined;
  readonly auditRows: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getCustomerAuditTimelineQuery>>;
  readonly sessionRow: Awaited<ReturnType<typeof userAdminCustomerDetailAccessors.getLatestSessionActivityQuery>>[number] | undefined;
}

function groupOrderItemTitles(rows: readonly { orderId: string; title: string }[]): Map<string, string[]> {
  const titlesByOrderId = new Map<string, string[]>();

  for (const row of rows) {
    const existing = titlesByOrderId.get(row.orderId) ?? [];
    existing.push(row.title);
    titlesByOrderId.set(row.orderId, existing);
  }

  return titlesByOrderId;
}

function resolveLocalizedCategoryLabel(titles: unknown, locale: string): string {
  const label = resolveCategoryTitle(titles, locale).trim();
  return label === "" ? UNCATEGORIZED_LABEL : label;
}

function resolveLocalizedCollectionLabel(titles: unknown, locale: string): string | undefined {
  const label = resolveCollectionTitle(titles, locale).trim();
  return label === "" ? undefined : label;
}

function resolveSpendingWindowStart(monthsWindow: number): Date {
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsWindow - MONTH_OFFSET));
  since.setDate(MONTH_START_DAY);
  since.setHours(MONTH_START_HOUR, MONTH_START_MINUTE, MONTH_START_SECOND, MONTH_START_MILLISECOND);
  return since;
}

function resolveAdminCustomerRoleBadgeKey(role: User["select"]["role"], isReturning: boolean): User["adminCustomerDetail"]["roleBadgeKey"] {
  if (role === ROLES.ADMIN) {
    return "roleAdmin";
  }

  if (isReturning) {
    return "returning";
  }

  return "roleCustomer";
}

async function loadAdminCustomerDetailQueryResult(userId: string, since: Date): Promise<AdminCustomerDetailQueryResult> {
  const [
    orderStatsRows,
    addressRows,
    sessionRows,
    monthlySpendingRows,
    categoryBreakdownRows,
    preferredCategoryRows,
    preferredCollectionRows,
    orderRows,
    auditRows
  ] = await Promise.all([
    userAccessors.getCustomerOrderStatsQuery([userId]),
    userAdminCustomerDetailAccessors.getDefaultCustomerAddressFullQuery(userId),
    userAdminCustomerDetailAccessors.getLatestSessionActivityQuery(userId),
    userAdminCustomerDetailAccessors.getCustomerMonthlySpendingQuery(userId, since),
    userAdminCustomerDetailAccessors.getCustomerCategoryBreakdownQuery(userId),
    userAdminCustomerDetailAccessors.getCustomerPreferredCategoryQuery(userId),
    userAdminCustomerDetailAccessors.getCustomerPreferredCollectionQuery(userId),
    userAdminCustomerDetailAccessors.getAdminCustomerOrderRowsQuery(userId),
    userAdminCustomerDetailAccessors.getCustomerAuditTimelineQuery(userId)
  ]);

  const itemTitleRows = await userAdminCustomerDetailAccessors.getOrderItemTitlesQuery(orderRows.map((row) => row.id));
  const statsByUserId = mapCustomerOrderStats(orderStatsRows);

  return {
    addressRow: addressRows[FIRST_ROW_INDEX],
    auditRows,
    categoryBreakdownRows,
    itemTitleRows,
    monthlySpendingRows,
    orderRows,
    orderStats: statsByUserId.get(userId),
    preferredCategoryRow: preferredCategoryRows[FIRST_ROW_INDEX],
    preferredCollectionRow: preferredCollectionRows[FIRST_ROW_INDEX],
    sessionRow: sessionRows[FIRST_ROW_INDEX]
  };
}

function mapAdminCustomerDetailOrders(
  orderRows: readonly AdminCustomerOrderRow[],
  titlesByOrderId: Map<string, string[]>,
  locale: string
): User["adminCustomerDetail"]["orders"] {
  return orderRows.map((row) => ({
    currencyCode: row.currencyCode,
    date: formatAdminOrderDate(row.createdAt),
    fulfillment: resolveAdminOrderFulfillmentUiKey(row.status, row.fulfillmentStatus),
    id: row.id,
    itemTitles: titlesByOrderId.get(row.id) ?? [],
    payment: resolveAdminOrderPaymentUiKey(row.paymentStatus),
    total: formatPrice(row.total, row.currencyCode, locale),
    totalMinor: row.total
  }));
}

interface BuildAdminCustomerDetailPayloadInput {
  readonly locale: string;
  readonly monthsWindow: number;
  readonly queryResult: AdminCustomerDetailQueryResult;
  readonly userRow: User["select"];
}

function buildAdminCustomerDetailPayload(input: BuildAdminCustomerDetailPayloadInput): User["adminCustomerDetail"] {
  const { locale, monthsWindow, queryResult, userRow } = input;
  const orderCount = queryResult.orderStats?.orderCount ?? EMPTY_LENGTH;
  const totalSpent = queryResult.orderStats?.totalSpent ?? EMPTY_LENGTH;
  const averageOrderValue = resolveAdminCustomerAverageOrderValue(orderCount, totalSpent);
  const returningRate = resolveAdminCustomerReturningRate(orderCount);
  const isReturning = orderCount >= ADMIN_CUSTOMER_MIN_REPEAT_ORDERS;
  const titlesByOrderId = groupOrderItemTitles(queryResult.itemTitleRows);
  const orders = mapAdminCustomerDetailOrders(queryResult.orderRows, titlesByOrderId, locale);
  const monthlySpending = buildAdminCustomerMonthlySpendingSeries(queryResult.monthlySpendingRows, locale, monthsWindow);
  const categoryBreakdown = queryResult.categoryBreakdownRows
    .filter((row) => row.titles !== null)
    .map((row) => ({
      amount: row.amount,
      category: resolveLocalizedCategoryLabel(row.titles, locale)
    }))
    .filter((row) => row.amount > EMPTY_LENGTH);
  const preferredCategory =
    queryResult.preferredCategoryRow?.titles === null || queryResult.preferredCategoryRow?.titles === undefined
      ? undefined
      : resolveLocalizedCategoryLabel(queryResult.preferredCategoryRow.titles, locale);
  const preferredCollection =
    queryResult.preferredCollectionRow?.titles === undefined
      ? undefined
      : resolveLocalizedCollectionLabel(queryResult.preferredCollectionRow.titles, locale);
  const lastActiveAt = queryResult.sessionRow?.lastActiveAt ?? queryResult.orderStats?.lastOrderAt ?? userRow.updatedAt;
  const adminMetadata = parseAdminUserMetadata(userRow.metadata);
  const addressForm =
    queryResult.addressRow === undefined
      ? undefined
      : {
          address1: queryResult.addressRow.address1,
          address2: queryResult.addressRow.address2 ?? undefined,
          city: queryResult.addressRow.city,
          countryCode: queryResult.addressRow.countryCode,
          postalCode: queryResult.addressRow.postalCode ?? undefined,
          province: queryResult.addressRow.province ?? undefined
        };

  return {
    ...userRow,
    address: formatAdminCustomerFullAddress(queryResult.addressRow),
    addressForm,
    averageOrderValue,
    categoryBreakdown,
    customTags: adminMetadata.tags ?? [],
    initials: resolveAdminCustomerInitials(userRow.name),
    isReturning,
    joinDate: formatAdminCustomerJoinDate(userRow.createdAt, locale),
    lastActive: formatAdminCustomerLastActive(lastActiveAt, locale),
    lastOrderAt: queryResult.orderStats?.lastOrderAt,
    monthlySpending,
    notes: adminMetadata.notes,
    orderCount,
    orders,
    preferredCategory: preferredCategory === UNCATEGORIZED_LABEL ? undefined : preferredCategory,
    preferredCollection,
    returningRate,
    roleBadgeKey: resolveAdminCustomerRoleBadgeKey(userRow.role, isReturning),
    tags: resolveAdminCustomerTags(userRow, orderCount),
    timeline: buildAdminCustomerTimeline({
      auditEvents: queryResult.auditRows.map((row) => ({
        action: row.action,
        createdAt: row.createdAt,
        detail: row.detail,
        metadata: row.metadata
      })),
      createdAt: userRow.createdAt,
      locale,
      orders: queryResult.orderRows.map((row) => ({
        createdAt: row.createdAt,
        currencyCode: row.currencyCode,
        id: row.id,
        total: row.total
      }))
    }),
    totalSpent
  };
}

export async function getAdminCustomerDetail(input: AdminCustomerDetailInput): Promise<User["adminCustomerDetail"] | undefined> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const userRow = await userAccessors.getUserById(input.id);

  if (userRow === undefined) {
    return undefined;
  }

  const { monthsWindow } = userAdminCustomerDetailAccessors;
  const since = resolveSpendingWindowStart(monthsWindow);
  const queryResult = await loadAdminCustomerDetailQueryResult(input.id, since);

  return buildAdminCustomerDetailPayload({ locale, monthsWindow, queryResult, userRow });
}
