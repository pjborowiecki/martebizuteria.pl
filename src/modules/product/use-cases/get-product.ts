import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { isProductInStock } from "~/src/modules/inventory/inventory.availability.utils"
import { getPublishedProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { mapPublishedProductForStorefront } from "~/src/modules/product/product.utils"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const getProduct = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productZodSchemas.productByHandleInput>) => productZodSchemas.productByHandleInput.parse(input))
  .handler(async ({ data }) => {
    const { handle } = data
    const locale = data.locale ?? I18N.DEFAULT_LOCALE

    const prod = await getPublishedProductByHandleQuery.execute({ handle })

    if (prod === undefined || !isProductInStock(prod.variants)) {
      return false
    }

    return mapPublishedProductForStorefront(prod, locale)
  })

export const getProductQuery = (handle: string, locale: string = I18N.DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => getProduct({ data: { handle, locale } }),
    queryKey: [...PRODUCT_QUERY_KEYS.BY_HANDLE, handle, locale],
  })
