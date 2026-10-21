import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { isSalesPaused } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

export interface SalesStatus {
  readonly salesPaused: boolean
}

const readSalesStatus = async (): Promise<SalesStatus> => ({ salesPaused: await isSalesPaused() })

export const getSalesStatus = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(() => readThroughStorefrontCache(readSalesStatus))

export const getAdminSalesStatus = createServerFn({ method: "GET" }).middleware([withRequest]).handler(readSalesStatus)

export const getSalesStatusQuery = () =>
  queryOptions({
    queryFn: () => getSalesStatus(),
    queryKey: STORE_SETTING_QUERY_KEYS.SALES,
  })

export const getAdminSalesStatusQuery = () =>
  queryOptions({
    queryFn: () => getAdminSalesStatus(),
    queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.SALES,
  })
