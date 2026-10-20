import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { shopSenderAddress } from "~/src/integrations/resend/resend.config"
import { RESEND_QUERY_KEYS } from "~/src/integrations/resend/resend.constants"

export const getShopSender = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .handler((): ShopSender => ({ address: shopSenderAddress() }))

export const getShopSenderQuery = () =>
  queryOptions({
    queryFn: () => getShopSender(),
    queryKey: RESEND_QUERY_KEYS.ADMIN.SHOP_SENDER,
  })

export interface ShopSender {
  readonly address: string
}
