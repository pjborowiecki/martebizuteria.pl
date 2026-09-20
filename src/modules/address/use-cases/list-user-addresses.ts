import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"
import { address } from "~/src/modules/address/address.schema"

export const fetchUserAddressesFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getRequestSession()

  if (!session) {
    return []
  }

  return db.query.address.findMany({ where: eq(address.userId, session.user.id) })
})

export const userAddressesQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchUserAddressesFn(),
    queryKey: ADDRESS_QUERY_KEYS.ALL,
  })
