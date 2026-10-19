import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { listAccountProviderIds } from "~/src/modules/account/account.accessors"
import { CREDENTIAL_PROVIDER_ID, GOOGLE_PROVIDER_ID } from "~/src/modules/account/account.constants"
import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<User["customerProfile"] | undefined> => {
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
    queryKey: USER_QUERY_KEYS.CUSTOMER.PROFILE,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
