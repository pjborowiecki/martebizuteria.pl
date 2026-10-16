import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { listAccountProviderIds } from "~/src/modules/account/account.accessors"
import { CREDENTIAL_PROVIDER_ID, GOOGLE_PROVIDER_ID } from "~/src/modules/account/account.constants"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { getUserById } from "~/src/modules/user/user.accessors"

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<CustomerAccount["profile"] | undefined> => {
    const [userRow, providerIds] = await Promise.all([getUserById(context.auth.user.id), listAccountProviderIds(context.auth.user.id)])

    if (userRow === undefined) {
      return undefined
    }

    return {
      createdAt: userRow.createdAt,
      email: userRow.email,
      emailVerified: userRow.emailVerified,
      hasGoogle: providerIds.includes(GOOGLE_PROVIDER_ID),
      hasPassword: providerIds.includes(CREDENTIAL_PROVIDER_ID),
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
