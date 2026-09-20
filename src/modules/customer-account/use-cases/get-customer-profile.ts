import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccountProfile } from "~/src/modules/customer-account/customer-account.types"
import { getUserById } from "~/src/modules/user/user.accessors"

export const fetchCustomerProfileFn = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerAccountProfile | undefined> => {
  const authSession = await getRequestSession()
  if (authSession?.user === undefined) {
    return undefined
  }

  const userRow = await getUserById(authSession.user.id)
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

export const profileQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCustomerProfileFn(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
