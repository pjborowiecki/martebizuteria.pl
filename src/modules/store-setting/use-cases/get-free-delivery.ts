import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { findFreeDeliveryThreshold } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

export const getFreeDelivery = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(async (): Promise<FreeDelivery> => ({ threshold: await findFreeDeliveryThreshold() }))

export const getFreeDeliveryQuery = () =>
  queryOptions({
    queryFn: () => getFreeDelivery(),
    queryKey: STORE_SETTING_QUERY_KEYS.FREE_DELIVERY,
  })

export const getAdminFreeDeliveryQuery = () =>
  queryOptions({
    queryFn: () => getFreeDelivery(),
    queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY,
  })

export interface FreeDelivery {
  readonly threshold: number | undefined
}
