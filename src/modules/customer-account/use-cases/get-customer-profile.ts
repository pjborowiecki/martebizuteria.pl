import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { getUserById } from "~/src/modules/user/user.accessors"

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<CustomerAccount["profile"] | undefined> => {
    const userRow = await getUserById(context.auth.user.id)
    if (userRow === undefined) {
      return undefined
    }

    return {
      createdAt: userRow.createdAt,
      email: userRow.email,
      name: userRow.name,
      phone: userRow.phone ?? undefined,
      timezone: userRow.timezone ?? undefined,
    }
  })

export const getCustomerProfileQuery = () =>
  queryOptions({
    queryFn: () => getCustomerProfile(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
