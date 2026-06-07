import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { orderAccessors } from "~/src/modules/order/order.accessors";
import type { AdminOrdersListFilters } from "~/src/modules/order/order.admin-list-filters";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  isAdminOrderTab,
  ORDER_QUERY_STALE_MS,
  type AdminOrderStatFilter,
  type AdminOrderTab
} from "~/src/modules/order/order.constants";
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils";
import type { AdminOrderStats, Order } from "~/src/modules/order/order.types";

export interface AdminOrdersPageInput {
  readonly createdAt?: AdminOrdersListFilters["createdAt"];
  readonly fulfillment?: AdminOrdersListFilters["fulfillment"];
  readonly page?: number;
  readonly pageSize?: number;
  readonly payment?: AdminOrdersListFilters["payment"];
  readonly search?: string;
  readonly statFilter?: AdminOrderStatFilter;
  readonly status?: AdminOrdersListFilters["status"];
  readonly tab?: AdminOrderTab;
  readonly total?: AdminOrdersListFilters["total"];
}

export type AdminOrdersExportInput = Omit<AdminOrdersPageInput, "page" | "pageSize">;

function buildAdminOrdersListParams(input: AdminOrdersPageInput) {
  const pageSize = input.pageSize ?? ADMIN_ORDERS_PAGE_SIZE;
  const tab = input.tab !== undefined && isAdminOrderTab(input.tab) ? input.tab : undefined;

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    filters: {
      createdAt: input.createdAt,
      fulfillment: input.fulfillment,
      payment: input.payment,
      status: input.status,
      total: input.total
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter,
    tab
  };
}

function buildAdminOrdersExportParams(input: AdminOrdersExportInput) {
  const tab = input.tab !== undefined && isAdminOrderTab(input.tab) ? input.tab : undefined;

  return {
    filters: {
      createdAt: input.createdAt,
      fulfillment: input.fulfillment,
      payment: input.payment,
      status: input.status,
      total: input.total
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter,
    tab
  };
}

async function getAdminOrdersPage(
  input: AdminOrdersPageInput
): Promise<ReturnType<typeof buildListPaginationResult<Order["adminListItem"]>>> {
  const params = buildAdminOrdersListParams(input);
  const { rows, total } = await orderAccessors.getAdminOrdersPage(params);
  const items = rows.map((row) => toAdminOrderListItem(row));

  return buildListPaginationResult(items, total, params);
}

async function getAdminOrdersExport(input: AdminOrdersExportInput): Promise<Order["adminListItem"][]> {
  const params = buildAdminOrdersExportParams(input);
  const rows = await orderAccessors.getAdminOrdersExport(params);
  return rows.map((row) => toAdminOrderListItem(row));
}

const fetchAdminOrdersPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminOrdersPageInput) => input)
  .handler(({ data }) => getAdminOrdersPage(data));

const fetchAdminOrdersExportFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminOrdersExportInput) => input)
  .handler(({ data }) => getAdminOrdersExport(data));

const fetchAdminOrderStatsFn = createServerFn({ method: "GET" }).handler(() => orderAccessors.getAdminOrderStats());

export const orderQueries = {
  fetchAdminOrderStatsFn,
  fetchAdminOrdersExportFn,
  fetchAdminOrdersPageFn
};

export const orderQueryOptions = {
  adminOrderStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminOrderStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.ORDER.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ORDER_QUERY_STALE_MS
    }),
  adminOrdersPageQueryOptions: (input: AdminOrdersPageInput) =>
    queryOptions({
      queryFn: () => fetchAdminOrdersPageFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.ORDER.ADMIN.PAGE, input] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ORDER_QUERY_STALE_MS
    })
};

export type { AdminOrderStats };
