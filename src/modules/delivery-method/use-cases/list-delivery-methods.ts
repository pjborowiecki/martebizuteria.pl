import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { courier } from "~/src/modules/courier/courier.schema"
import { deliveryMethodOrder, offeredDeliveryMethod } from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

export const listDeliveryMethods = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(async () => {
    const rows = await readThroughStorefrontCache(() =>
      db
        .select({ courier, deliveryMethod })
        .from(deliveryMethod)
        .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
        .where(offeredDeliveryMethod)
        .orderBy(...deliveryMethodOrder),
    )

    const locale = getCurrentLocale()

    return rows.map((row) =>
      Object.assign(row.deliveryMethod, { courier: row.courier, name: resolveLocalizedString(row.deliveryMethod.names, locale) }),
    )
  })

export const listDeliveryMethodsQuery = () =>
  queryOptions({
    queryFn: () => listDeliveryMethods(),
    queryKey: DELIVERY_METHOD_QUERY_KEYS.ALL,
  })
