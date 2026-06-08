import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants";
import {
  getCustomerLoginHistory,
  getCustomerOrderById,
  getCustomerOrders,
  getCustomerOverview,
  getCustomerProfile,
  getCustomerSessions
} from "~/src/modules/customer-account/customer-account.server";
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod";

const localeInputSchema = z.object({
  locale: z.string().optional()
});

const fetchCustomerOrdersFn = createServerFn({ method: "GET" }).handler(() => getCustomerOrders());

const fetchCustomerOrderByIdFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => customerAccountZodSchemas.orderIdInput.parse(data))
  .handler(({ data: { orderId } }) => getCustomerOrderById(orderId));

const fetchCustomerOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => localeInputSchema.parse(data ?? {}))
  .handler(({ data: { locale } }) => getCustomerOverview(locale ?? DEFAULT_LOCALE));

const fetchCustomerProfileFn = createServerFn({ method: "GET" }).handler(() => getCustomerProfile());

const fetchCustomerSessionsFn = createServerFn({ method: "GET" }).handler(() => getCustomerSessions());

const fetchCustomerLoginHistoryFn = createServerFn({ method: "GET" }).handler(() => getCustomerLoginHistory());

export const customerAccountQueries = {
  fetchCustomerLoginHistoryFn,
  fetchCustomerOrderByIdFn,
  fetchCustomerOrdersFn,
  fetchCustomerOverviewFn,
  fetchCustomerProfileFn,
  fetchCustomerSessionsFn
};

export const customerAccountQueryOptions = {
  loginHistoryQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCustomerLoginHistoryFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.LOGIN_HISTORY,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    }),
  orderByIdQueryOptions: (orderId: string) =>
    queryOptions({
      queryFn: () => fetchCustomerOrderByIdFn({ data: { orderId } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.ORDER_BY_ID, orderId] as const,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    }),
  ordersQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCustomerOrdersFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.ORDERS,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    }),
  overviewQueryOptions: (locale: string = DEFAULT_LOCALE) =>
    queryOptions({
      queryFn: () => fetchCustomerOverviewFn({ data: { locale } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.OVERVIEW, locale] as const,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    }),
  profileQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCustomerProfileFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.PROFILE,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    }),
  sessionsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCustomerSessionsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.SESSIONS,
      staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
    })
};
