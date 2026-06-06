import { useCallback, useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ADMIN_SEARCH_DEBOUNCE_MS } from "~/src/lib/_utils/admin-search";
import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useDebounce } from "~/src/hooks/use-debounce";
import { ADMIN_ORDERS_PAGE_SIZE, ADMIN_ORDER_TAB, isAdminOrderTab, type AdminOrderTab } from "~/src/modules/order/order.constants";
import { orderQueryOptions } from "~/src/modules/order/order.queries";
import type { Order } from "~/src/modules/order/order.types";

const TABLE_PAGE_INDEX_START = 0;
const PAGE_OFFSET = 1;

const EMPTY_ORDERS_PAGE = {
  hasMore: false,
  items: [] as Order["adminListItem"][],
  limit: ADMIN_ORDERS_PAGE_SIZE,
  offset: 0,
  total: 0
} as const;

export interface UseOrdersListResult {
  readonly activeTab: AdminOrderTab;
  readonly filteredCount: number;
  readonly isLoading: boolean;
  readonly onNextPage: () => void;
  readonly onPreviousPage: () => void;
  readonly onQueryChange: (query: string) => void;
  readonly onTabChange: (tab: AdminOrderTab) => void;
  readonly orders: readonly Order["adminListItem"][];
  readonly page: number;
  readonly pageCount: number;
  readonly query: string;
  readonly totalCount: number;
}

export function useOrdersList(): UseOrdersListResult {
  const [activeTab, setActiveTab] = useState<AdminOrderTab>(ADMIN_ORDER_TAB.ALL);
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(TABLE_PAGE_INDEX_START);
  const debouncedQuery = useDebounce(query, ADMIN_SEARCH_DEBOUNCE_MS).trim();

  const pageQueryOptions = orderQueryOptions.adminOrdersPageQueryOptions({
    page: pageIndex + LIST_PAGE_STEP,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    search: debouncedQuery === "" ? undefined : debouncedQuery,
    tab: activeTab === ADMIN_ORDER_TAB.ALL ? undefined : activeTab
  });

  const {
    data = EMPTY_ORDERS_PAGE,
    isPending,
    isPlaceholderData
  } = useQuery({
    ...pageQueryOptions,
    placeholderData: keepPreviousData
  });

  const pageCount = Math.max(Math.ceil(data.total / ADMIN_ORDERS_PAGE_SIZE), PAGE_OFFSET);
  const isLoading = isPending && !isPlaceholderData;

  useEffect(() => {
    setPageIndex(TABLE_PAGE_INDEX_START);
  }, [activeTab, debouncedQuery]);

  const onTabChange = useCallback((tab: AdminOrderTab) => {
    if (isAdminOrderTab(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const onQueryChange = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
  }, []);

  const onPreviousPage = useCallback(() => {
    setPageIndex((previous) => Math.max(previous - PAGE_OFFSET, TABLE_PAGE_INDEX_START));
  }, []);

  const onNextPage = useCallback(() => {
    setPageIndex((previous) => Math.min(previous + PAGE_OFFSET, pageCount - PAGE_OFFSET));
  }, [pageCount]);

  return useMemo(
    () => ({
      activeTab,
      filteredCount: data.items.length,
      isLoading,
      onNextPage,
      onPreviousPage,
      onQueryChange,
      onTabChange,
      orders: data.items,
      page: pageIndex + PAGE_OFFSET,
      pageCount,
      query,
      totalCount: data.total
    }),
    [activeTab, data.items, data.total, isLoading, onNextPage, onPreviousPage, onQueryChange, onTabChange, pageCount, pageIndex, query]
  );
}
