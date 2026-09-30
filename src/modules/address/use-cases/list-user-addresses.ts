import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"
import { address } from "~/src/modules/address/address.schema"

export const listUserAddresses = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(({ context }) => db.query.address.findMany({ where: eq(address.userId, context.auth.user.id) }))

export const listUserAddressesQuery = () =>
  queryOptions({
    queryFn: () => listUserAddresses(),
    queryKey: ADDRESS_QUERY_KEYS.ALL,
  })
