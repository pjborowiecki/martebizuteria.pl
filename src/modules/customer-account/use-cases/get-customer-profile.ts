import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { hasCredentialAccount } from "~/src/modules/account/account.accessors"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { getUserById } from "~/src/modules/user/user.accessors"

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<CustomerAccount["profile"] | undefined> => {
    const [userRow, hasPassword] = await Promise.all([getUserById(context.auth.user.id), hasCredentialAccount(context.auth.user.id)])

    if (userRow === undefined) {
      return undefined
    }

    return {
      createdAt: userRow.createdAt,
      email: userRow.email,
      emailVerified: userRow.emailVerified,
      hasPassword,
      name: userRow.name,
      phone: userRow.phone ?? undefined,
      timezone: userRow.timezone ?? undefined,
      twoFactorEnabled: userRow.twoFactorEnabled === true,
    }
  })

export const getCustomerProfileQuery = () =>
  queryOptions({
    queryFn: async () => {
      const profile = await getCustomerProfile()

      if (profile === undefined) {
        throw notFound()
      }

      return profile
    },
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
