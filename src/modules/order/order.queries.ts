import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { orderAccessors, type AdminOrdersListParams } from "~/src/modules/order/order.accessors";
import { ADMIN_ORDERS_PAGE_SIZE, isAdminOrderTab, ORDER_QUERY_STALE_MS, type AdminOrderTab } from "~/src/modules/order/order.constants";
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils";
import type { Order } from "~/src/modules/order/order.types";

export interface AdminOrdersPageInput {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly tab?: AdminOrderTab;
}

function buildAdminOrdersListParams(input: AdminOrdersPageInput): AdminOrdersListParams {
  const pageSize = input.pageSize ?? ADMIN_ORDERS_PAGE_SIZE;
  const tab = input.tab !== undefined && isAdminOrderTab(input.tab) ? input.tab : undefined;

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    search: normalizeAdminSearchTerm(input.search),
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

const fetchAdminOrdersPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminOrdersPageInput) => input)
  .handler(({ data }) => getAdminOrdersPage(data));

export const orderQueries = {
  fetchAdminOrdersPageFn
};

export const orderQueryOptions = {
  adminOrdersPageQueryOptions: (input: AdminOrdersPageInput) =>
    queryOptions({
      queryFn: () => fetchAdminOrdersPageFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.ORDER.ADMIN.PAGE, input] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ORDER_QUERY_STALE_MS
    })
};
