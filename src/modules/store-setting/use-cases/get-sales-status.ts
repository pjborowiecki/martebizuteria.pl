import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { isSalesPaused } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

export interface SalesStatus {
  readonly salesPaused: boolean
}

export const getSalesStatus = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(async (): Promise<SalesStatus> => ({ salesPaused: await isSalesPaused() }))

export const getSalesStatusQuery = () =>
  queryOptions({
    queryFn: () => getSalesStatus(),
    queryKey: STORE_SETTING_QUERY_KEYS.SALES,
  })

export const getAdminSalesStatusQuery = () =>
  queryOptions({
    queryFn: () => getSalesStatus(),
    queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.SALES,
  })
