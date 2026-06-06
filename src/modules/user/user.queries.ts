import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { userAccessors, type AdminCustomersListParams } from "~/src/modules/user/user.accessors";
import { getAdminCustomerDetail, type AdminCustomerDetailInput } from "~/src/modules/user/user.admin-customer-detail.server";
import type { AdminCustomersListFilters } from "~/src/modules/user/user.admin-list-filters";
import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS, type AdminCustomerStatFilter } from "~/src/modules/user/user.constants";
import { computeAdminCustomerStatsFromAggregates, mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils";

const ZERO_AVERAGE = 0;
const ZERO_COUNT = 0;

export interface AdminCustomersPageInput {
  readonly averageOrderValue?: AdminCustomersListFilters["averageOrderValue"];
  readonly banned?: AdminCustomersListFilters["banned"];
  readonly createdAt?: AdminCustomersListFilters["createdAt"];
  readonly emailVerified?: AdminCustomersListFilters["emailVerified"];
  readonly lastOrderAt?: AdminCustomersListFilters["lastOrderAt"];
  readonly page?: number;
  readonly pageSize?: number;
  readonly role?: AdminCustomersListFilters["role"];
  readonly search?: string;
  readonly statFilter?: AdminCustomerStatFilter;
  readonly totalSpent?: AdminCustomersListFilters["totalSpent"];
}

export interface AdminCustomersExportInput {
  readonly averageOrderValue?: AdminCustomersListFilters["averageOrderValue"];
  readonly banned?: AdminCustomersListFilters["banned"];
  readonly createdAt?: AdminCustomersListFilters["createdAt"];
  readonly emailVerified?: AdminCustomersListFilters["emailVerified"];
  readonly lastOrderAt?: AdminCustomersListFilters["lastOrderAt"];
  readonly role?: AdminCustomersListFilters["role"];
  readonly search?: string;
  readonly statFilter?: AdminCustomerStatFilter;
  readonly totalSpent?: AdminCustomersListFilters["totalSpent"];
}

async function loadAdminCustomerListItems() {
  const [customers, orderStats, addresses] = await Promise.all([
    userAccessors.getAdminCustomersQuery.execute(),
    userAccessors.getCustomerOrderStatsQuery(),
    userAccessors.getDefaultCustomerAddressesQuery()
  ]);

  const statsByUserId = mapCustomerOrderStats(orderStats);
  const addressByUserId = new Map(
    addresses
      .filter((row) => row.userId !== null)
      .map((row) => [row.userId!, { city: row.city, countryCode: row.countryCode, province: row.province }])
  );

  return customers.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)));
}

function buildAdminCustomersListParams(input: AdminCustomersPageInput): AdminCustomersListParams {
  const pageSize = input.pageSize ?? ADMIN_CUSTOMER_PAGE_SIZE;

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    filters: {
      averageOrderValue: input.averageOrderValue,
      banned: input.banned,
      createdAt: input.createdAt,
      emailVerified: input.emailVerified,
      lastOrderAt: input.lastOrderAt,
      role: input.role,
      totalSpent: input.totalSpent
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter
  };
}

function buildAdminCustomersExportParams(
  input: AdminCustomersExportInput
): Pick<AdminCustomersListParams, "search" | "statFilter" | "filters"> {
  return {
    filters: {
      averageOrderValue: input.averageOrderValue,
      banned: input.banned,
      createdAt: input.createdAt,
      emailVerified: input.emailVerified,
      lastOrderAt: input.lastOrderAt,
      role: input.role,
      totalSpent: input.totalSpent
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter
  };
}

async function getAdminCustomersPage(input: AdminCustomersPageInput) {
  const params = buildAdminCustomersListParams(input);
  const { addresses, orderStats, rows, total } = await userAccessors.getAdminCustomersPage(params);
  const statsByUserId = mapCustomerOrderStats(orderStats);
  const addressByUserId = new Map(
    addresses
      .filter((row) => row.userId !== null)
      .map((row) => [row.userId!, { city: row.city, countryCode: row.countryCode, province: row.province }])
  );
  const items = rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)));

  return buildListPaginationResult(items, total, params);
}

async function getAdminCustomersExport(input: AdminCustomersExportInput) {
  const params = buildAdminCustomersExportParams(input);
  const { addresses, orderStats, rows } = await userAccessors.getAdminCustomersFilteredList(params);
  const statsByUserId = mapCustomerOrderStats(orderStats);
  const addressByUserId = new Map(
    addresses
      .filter((row) => row.userId !== null)
      .map((row) => [row.userId!, { city: row.city, countryCode: row.countryCode, province: row.province }])
  );

  return rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)));
}

const fetchAdminCustomersFn = createServerFn({ method: "GET" }).handler(() => loadAdminCustomerListItems());

const fetchAdminCustomersPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminCustomersPageInput) => input)
  .handler(({ data }) => getAdminCustomersPage(data));

const fetchAdminCustomersExportFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminCustomersExportInput) => input)
  .handler(({ data }) => getAdminCustomersExport(data));

const fetchAdminCustomerByIdFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminCustomerDetailInput) => input)
  .handler(({ data }) => getAdminCustomerDetail(data));

const fetchAdminCustomerStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [[totalRow], [rollupRow], [averageProductsPerOrderRow]] = await Promise.all([
    userAccessors.getAdminCustomerTotalCountQuery.execute(),
    userAccessors.getAdminCustomerOrderRollupStatsQuery.execute(),
    userAccessors.getAverageProductsPerOrderQuery.execute()
  ]);

  return computeAdminCustomerStatsFromAggregates({
    averageLtv: rollupRow?.averageLtv ?? ZERO_COUNT,
    averageProductsPerOrder: averageProductsPerOrderRow?.value ?? ZERO_AVERAGE,
    customersWithOrders: rollupRow?.customersWithOrders ?? ZERO_COUNT,
    repeatCustomers: rollupRow?.repeatCustomers ?? ZERO_COUNT,
    total: totalRow?.count ?? ZERO_COUNT
  });
});

export const userQueries = {
  fetchAdminCustomerByIdFn,
  fetchAdminCustomerStatsFn,
  fetchAdminCustomersExportFn,
  fetchAdminCustomersFn,
  fetchAdminCustomersPageFn
};

export const userQueryOptions = {
  adminCustomerByIdQueryOptions: (id: string, locale: string) =>
    queryOptions({
      enabled: id !== "",
      queryFn: () => fetchAdminCustomerByIdFn({ data: { id, locale } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMER_BY_ID, id, locale] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS
    }),
  adminCustomerStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminCustomerStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMER_STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS
    }),
  adminCustomersPageQueryOptions: (input: AdminCustomersPageInput) =>
    queryOptions({
      queryFn: () => fetchAdminCustomersPageFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS_PAGE, input] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS
    }),
  adminCustomersQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminCustomersFn(),
      queryKey: CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS
    })
};
