import { QueryClient, queryOptions } from "@tanstack/react-query"

import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

export const TEST_SELLER_DETAILS = {
  city: "Kraków",
  countryCode: "PL",
  email: "sklep@marte.test",
  legalName: "Pracownia Testowa Anna Nowak",
  nip: "5260250274",
  phone: "+48 600 100 200",
  postalCode: "31-001",
  regon: "100000050",
  street: "ul. Floriańska 1",
} as const

export const TEST_STORED_SELLER_DETAILS = { ...TEST_SELLER_DETAILS, updatedAt: new Date("2026-10-16T12:00:00.000Z") }

export const SELLER_DETAILS_QUERIES = {
  getAdminSellerDetailsQuery: () =>
    queryOptions({ queryFn: () => Promise.resolve(TEST_STORED_SELLER_DETAILS), queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS }),
  getSellerDetailsQuery: () =>
    queryOptions({ queryFn: () => Promise.resolve(TEST_STORED_SELLER_DETAILS), queryKey: STORE_SETTING_QUERY_KEYS.SELLER_DETAILS }),
}

export const createSellerDetailsQueryClient = (): QueryClient => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.SELLER_DETAILS, TEST_STORED_SELLER_DETAILS)
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS, TEST_STORED_SELLER_DETAILS)

  return queryClient
}
