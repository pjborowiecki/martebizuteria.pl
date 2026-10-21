import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

export const getSellerDetails = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(() => readThroughStorefrontCache(() => readSellerDetails()))

export const getAdminSellerDetails = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(() => readSellerDetails())

export const getSellerDetailsQuery = () =>
  queryOptions({
    queryFn: () => getSellerDetails(),
    queryKey: STORE_SETTING_QUERY_KEYS.SELLER_DETAILS,
  })

export const getAdminSellerDetailsQuery = () =>
  queryOptions({
    queryFn: () => getAdminSellerDetails(),
    queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS,
  })
